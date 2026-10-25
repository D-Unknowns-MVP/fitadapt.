<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) { http_response_code(503); echo json_encode(['error' => 'API is not configured. Copy api/config.example.php to api/config.php and set database credentials.']); exit; }
$config = require $configFile;
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $config['allowed_origins'] ?? [], true)) {
  header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); header('Access-Control-Allow-Credentials: false');
}
header('Access-Control-Allow-Headers: Content-Type, X-FitAdapt-Device');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
function respond(array $data, int $status=200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function body(): array { $v = json_decode(file_get_contents('php://input') ?: '{}', true); return is_array($v) ? $v : []; }
function pdo(array $c): PDO {
  return new PDO('mysql:host='.$c['db_host'].';port='.$c['db_port'].';dbname='.$c['db_name'].';charset=utf8mb4', $c['db_user'], $c['db_pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
}
try {
  $db = pdo($config);
  $route = $_GET['route'] ?? 'health';
  if ($route === 'health') respond(['ok'=>true, 'service'=>'FitAdapt MySQL API']);
  if ($route === 'catalog' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $criteria = $db->query('SELECT code, name, description, weight FROM criteria ORDER BY sort_order')->fetchAll();
    $equipment = $db->query('SELECT id, label FROM equipment')->fetchAll();
    $exercises = $db->query('SELECT id, name, muscle, difficulty, kind, low_impact, instruction, pose_label FROM exercises ORDER BY sort_order')->fetchAll();
    $secondary = $db->query('SELECT exercise_id, muscle FROM exercise_secondary_muscles')->fetchAll();
    $gear = $db->query('SELECT exercise_id, equipment_id, required FROM exercise_equipment')->fetchAll();
    $envs = $db->query('SELECT exercise_id, environment FROM exercise_environments')->fetchAll();
    $goals = $db->query('SELECT exercise_id, goal, score FROM exercise_goal_scores')->fetchAll();
    $byId=[]; foreach ($exercises as $e) { $byId[$e['id']] = ['id'=>$e['id'],'name'=>$e['name'],'muscle'=>$e['muscle'],'secondary'=>[],'difficulty'=>(int)$e['difficulty'],'requires'=>[],'worksWith'=>[],'environments'=>[],'goals'=>[],'kind'=>$e['kind'],'lowImpact'=>(bool)$e['low_impact'],'instruction'=>$e['instruction']]; if ($e['pose_label']) $byId[$e['id']]['pose']=$e['pose_label']; }
    foreach ($secondary as $r) if(isset($byId[$r['exercise_id']])) $byId[$r['exercise_id']]['secondary'][]=$r['muscle'];
    foreach ($gear as $r) if(isset($byId[$r['exercise_id']])) { $byId[$r['exercise_id']]['worksWith'][]=$r['equipment_id']; if((bool)$r['required']) $byId[$r['exercise_id']]['requires'][]=$r['equipment_id']; }
    foreach ($envs as $r) if(isset($byId[$r['exercise_id']])) $byId[$r['exercise_id']]['environments'][]=$r['environment'];
    foreach ($goals as $r) if(isset($byId[$r['exercise_id']])) $byId[$r['exercise_id']]['goals'][$r['goal']]=(int)$r['score'];
    $goalKeys=['lose_weight','gain_muscle','build_abs','target_part','body_build']; foreach($byId as &$e) foreach($goalKeys as $g) if(!isset($e['goals'][$g])) $e['goals'][$g]=1; unset($e);
    $criteriaOut=array_map(fn($r)=>['code'=>$r['code'],'name'=>$r['name'],'description'=>$r['description'],'weight'=>(float)$r['weight']],$criteria);
    respond(['source'=>'mysql','exercises'=>array_values($byId),'criteria'=>$criteriaOut,'equipment'=>$equipment]);
  }
  if ($route === 'state' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $device = $_SERVER['HTTP_X_FITADAPT_DEVICE'] ?? ''; if (!preg_match('/^[a-f0-9-]{16,80}$/i', $device)) respond(['error'=>'Invalid device key'],400);
    $q=$db->prepare('SELECT state_json FROM fitadapt_device_state WHERE device_key=?'); $q->execute([$device]); $row=$q->fetch(); respond(['state'=>$row ? json_decode($row['state_json'],true) : null]);
  }
  if ($route === 'state' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $device = $_SERVER['HTTP_X_FITADAPT_DEVICE'] ?? ''; if (!preg_match('/^[a-f0-9-]{16,80}$/i', $device)) respond(['error'=>'Invalid device key'],400);
    $payload=body(); if (!isset($payload['state']) || !is_array($payload['state'])) respond(['error'=>'Missing state'],400);
    $json=json_encode($payload['state'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); if(strlen($json)>1000000) respond(['error'=>'State is too large'],413);
    $q=$db->prepare('INSERT INTO fitadapt_device_state (device_key,state_json) VALUES (?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json), updated_at=CURRENT_TIMESTAMP'); $q->execute([$device,$json]); respond(['ok'=>true]);
  }
  respond(['error'=>'Unknown route'],404);
} catch (Throwable $e) {
  error_log('FitAdapt API error: '.$e->getMessage());
  respond(['error'=>'Database/API error. Check api/config.php, database name, and run database/migrate_existing.sql in the existing database.'],500);
}
