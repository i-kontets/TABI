param(
    [string]$SchemaPath = "C:\Users\24100\Downloads\LAA1658851-web (1).sql",
    [string]$SeedPath = "$PSScriptRoot\test_data_reset.sql",
    [string]$OutputPath = "$PSScriptRoot\test_data_rebuild.sql"
)

$schema = Get-Content -LiteralPath $SchemaPath -Raw -Encoding UTF8
$seed = Get-Content -LiteralPath $SeedPath -Raw -Encoding UTF8

$tableMatches = [regex]::Matches($schema, 'CREATE TABLE `([^`]+)`')
$tables = @($tableMatches | ForEach-Object { $_.Groups[1].Value })
$createStatements = @(
    [regex]::Matches(
        $schema,
        '(?ms)^CREATE TABLE `[^`]+` \(.*?^\) ENGINE=.*?;$'
    ) | ForEach-Object { $_.Value }
)

$indexStart = $schema.IndexOf('-- ダンプしたテーブルのインデックス')
$autoIncrementStart = $schema.IndexOf('-- ダンプしたテーブルの AUTO_INCREMENT')
$indexSection = $schema.Substring(
    $indexStart,
    $autoIncrementStart - $indexStart
)

$seedStart = $seed.IndexOf('-- 単一IDを持つテーブルをAUTO_INCREMENT化します。')
$seedBody = $seed.Substring($seedStart)
$seedBody = $seedBody.Replace('SET FOREIGN_KEY_CHECKS = 1;', '')

$constraintMatches = [regex]::Matches(
    $schema,
    '(?ms)^ALTER TABLE `trip_members`\s+ADD CONSTRAINT.*?;$'
)
$constraints = @($constraintMatches | ForEach-Object { $_.Value })

$dropStatements = @($tables[($tables.Count - 1)..0] | ForEach-Object {
    "DROP TABLE IF EXISTS ``$_``;"
})

$parts = @(
    '-- TABI データベース完全再構築・テストデータ投入SQL'
    '-- 注意: 対象データベース内の既存35テーブルとデータを削除します。'
    'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";'
    'SET time_zone = "+09:00";'
    'SET NAMES utf8mb4;'
    'SET FOREIGN_KEY_CHECKS = 0;'
    ''
    ($dropStatements -join "`r`n")
    ''
    ($createStatements -join "`r`n`r`n")
    ''
    $indexSection.Trim()
    ''
    $seedBody.Trim()
    ''
    ($constraints -join "`r`n`r`n")
    ''
    'SET FOREIGN_KEY_CHECKS = 1;'
)

[System.IO.File]::WriteAllText(
    $OutputPath,
    ($parts -join "`r`n"),
    [System.Text.UTF8Encoding]::new($false)
)

Write-Output "Created: $OutputPath"
Write-Output "Tables: $($tables.Count)"
Write-Output "CREATE statements: $($createStatements.Count)"

