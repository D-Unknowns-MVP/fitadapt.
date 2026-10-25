<?php
// Copy to config.php and set credentials for your EXISTING XAMPP database.
return [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'fitadapt', // Change to your existing database name; this API never creates a database.
    'db_user' => 'root',
    'db_pass' => '',
    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
];
