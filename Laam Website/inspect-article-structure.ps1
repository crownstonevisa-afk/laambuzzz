$root = 'D:\Laam-1790195130580\Laam Website\articles'
$out = [Collections.Generic.List[string]]::new()
foreach ($file in Get-ChildItem -LiteralPath $root -Filter '*.html' -File | Sort-Object Name) {
  $html = [IO.File]::ReadAllText($file.FullName)
  $start = $html.IndexOf('<div class="article-body-content">')
  $end = $html.IndexOf('</div>', $start)
  $out.Add('===== ' + $file.Name + ' =====')
  $out.Add('bodyStart=' + $start + ' bodyEnd=' + $end)
  if ($start -ge 0 -and $end -ge 0) {
    $tailStart = [Math]::Max($start, $end - 500)
    $tailLen = [Math]::Min(900, $html.Length - $tailStart)
    $out.Add($html.Substring($tailStart, $tailLen))
  }
}
[IO.File]::WriteAllLines((Join-Path (Split-Path $root -Parent) '.body_structure_audit.txt'), $out, [Text.UTF8Encoding]::new($false))
