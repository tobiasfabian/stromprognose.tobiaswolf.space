<?php
$maxAge = 24 * 60 * 60; // 24h
header('Content-Type: text/csv');
header('Cache-Control: private, max-age=' . $maxAge);

$url = 'https://www.smard.de/nip-download-manager/nip/download/market-data';

$post = file_get_contents('php://input');
$requestHash = md5($post);
$data = json_decode($post);

$cacheFile = 'cache/' . md5($requestHash);

$cacheResponse = file_get_contents($cacheFile, true);
if ($cacheResponse !== false) {
	echo $cacheResponse;
	return;
}

$curl = curl_init('https://www.smard.de/nip-download-manager/nip/download/market-data');
curl_setopt($curl, CURLOPT_HTTPHEADER, [
	'Content-Type: application/json;charset=utf-8',
]);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($curl);
curl_close($curl);

// write cache
// var_dump(substr($response, -3));
// die();
if (!str_contains($response, ';-') && !str_contains($response, 'Keine Daten für gegebene Anfrage')) {
	$bytes = file_put_contents($cacheFile, $response, FILE_USE_INCLUDE_PATH);
}
echo $response;


