<?php
$authData = [
    "username" => "admin",
    "password" => "66033017"
];

$ch = curl_init('http://localhost:8000/api/token/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($authData));

$tokenResponse = curl_exec($ch);
curl_close($ch);

$tokenData = json_decode($tokenResponse, true);

if (!isset($tokenData['access'])) {
    echo "Ошибка авторизации: ";
    print_r($tokenData);
    exit;
}

$jwt = $tokenData['access'];

$data = [
    "id" => 12932,
    "name" => "Тест Клиент PHP",
    "phone" => "70000000002",
    "groups" => [1, 2]
];

$ch = curl_init('http://localhost:8000/api/clients/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $jwt
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);
curl_close($ch);

echo $response;
