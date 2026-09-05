# Local HTTP server for the model-viewer page (no external dependencies).
# Serves correct MIME types for .glb/.gltf/.usdz/.hdr and adds CORS headers.
#
# Run:     powershell -ExecutionPolicy Bypass -File server.ps1 -Port 8080
# Stop:    Ctrl+C
# Note: messages are ASCII-only on purpose (PowerShell 5.1 + UTF-8 issues).

param([int]$Port = 8080)

# Make redirected output UTF-8 (PowerShell 5.1 defaults to the OEM codepage).
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.glb'  = 'model/gltf-binary'
  '.gltf' = 'model/gltf+json'
  '.usdz' = 'model/vnd.usdz+zip'
  '.hdr'  = 'image/vnd.radiance'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.wasm' = 'application/wasm'
}

$bound = $null
$lastError = $null
# A failed Start() leaves the HttpListener unusable, so create a fresh one per attempt.
# "http://+:" accepts requests on any IP (requires admin rights or URL ACL);
# "http://localhost:" works without admin rights.
foreach ($prefix in @("http://+:$Port/", "http://localhost:$Port/")) {
  $listener = New-Object System.Net.HttpListener
  try {
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    $bound = $prefix
    break
  } catch {
    $lastError = $_.Exception.Message
    try { $listener.Close() } catch { }
  }
}

if (-not $bound) {
  Write-Output ("ERROR: cannot bind port {0}: {1}" -f $Port, $lastError)
  exit 1
}

$lanMode = ($bound -match '^\s*http://\+')
Write-Output ""
Write-Output ("Root folder: {0}" -f $root)
Write-Output ("Server bound to: {0}" -f $bound)
Write-Output ("Open in browser: http://localhost:{0}/" -f $Port)

$ips = @()
[Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | ForEach-Object {
  $_.GetIPProperties().UnicastAddresses | ForEach-Object {
    $a = $_.Address
    if ($a.AddressFamily -eq 'InterNetwork' -and $a.IPAddressToString -notmatch '^127\.') { $ips += $a.IPAddressToString }
  }
}
if ($lanMode -and $ips.Count -gt 0) {
  Write-Output "LAN addresses (phone in the same Wi-Fi network):"
  $ips | ForEach-Object { Write-Output ("    http://{0}:{1}/" -f $_, $Port) }
}
Write-Output "NOTE: AR on a real phone requires HTTPS (see README.md)."
Write-Output "Stop: Ctrl+C"
Write-Output ""

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      if ($path -eq '/') { $path = '/index.html' }

      $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
      $safe = $false
      if (Test-Path -LiteralPath $file -PathType Leaf) {
        $full = (Resolve-Path -LiteralPath $file).Path
        if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { $safe = $true; $file = $full }
      }

      if ($safe) {
        $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
        if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
        $res.Headers.Add('Access-Control-Allow-Origin', '*')
        $bytes = [IO.File]::ReadAllBytes($file)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Output ("200 {0}" -f $path)
      } else {
        $res.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
        Write-Output ("404 {0}" -f $path)
      }
    } catch {
      Write-Output ("Request error: {0}" -f $_.Exception.Message)
    } finally {
      try { $res.Close() } catch { }
    }
  }
} finally {
  $listener.Close()
}
