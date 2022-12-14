<?php
$maxAge = 24 * 60 * 60; // 24h
header('Content-Type: text/csv');
header('Cache-Control: private, max-age=' . $maxAge);

$url = 'https://www.smard.de/nip-download-manager/nip/download/market-data';

// DEBUG
// sleep(1);

$post = file_get_contents('php://input');
$requestHash = md5($post);
$data = json_decode($post);

$cacheFile = 'cache/' . md5($requestHash);

$cacheResponse = file_get_contents($cacheFile, true);
if ($cacheResponse !== false) {
	header('x-cache: '. $requestHash);
	echo $cacheResponse;
	return;
}

$curl = curl_init('https://www.smard.de/nip-download-manager/nip/download/market-data');
curl_setopt($curl, CURLOPT_HTTPHEADER, [
	'Content-Type: application/json;charset=utf-8',
	'Accept-Language: de-DE,de;q=0.9',
]);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($curl);
curl_close($curl);
$info = curl_getinfo($curl);

// write cache
if (!str_contains($response, ';-')
	&& !str_contains($response, 'Keine Daten für gegebene Anfrage')
	&& str_contains($info['content_type'], 'application/octet-stream')) {
	$bytes = file_put_contents($cacheFile, $response, FILE_USE_INCLUDE_PATH);
}
echo $response;


