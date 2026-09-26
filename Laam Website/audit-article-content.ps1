param([string]$Root = (Join-Path $PSScriptRoot 'articles'))

$sentenceStarts = @(
  'a','an','the','this','that','these','those','it','its','they','their','there','we','our','you','your',
  'if','in','on','at','by','for','from','with','without','as','and','or','but','because','while','although',
  'though','since','when','where','whether','after','before','during','once','each','every','some','many','most',
  'not','no','yes','any','both','all','other','others','under','into','about','only','also','so','then',
  'is','are','was','were','be','been','being','do','does','did','can','could','will','would','should','may',
  'might','must','has','have','had','he','she','him','her','his','who','what','why','how','which','first','second',
  'third','next','last','finally','instead','rather','even','still','already','always','never','often','usually','sometimes'
)
$stop = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$sentenceStarts | ForEach-Object { [void]$stop.Add($_) }
$output = [Collections.Generic.List[string]]::new()

foreach ($file in Get-ChildItem -LiteralPath $Root -Filter '*.html' -File | Sort-Object Name) {
  $html = [IO.File]::ReadAllText($file.FullName)
  $match = [regex]::Match($html, '(?s)<div class="article-body-content">(.*?)</div>\s*<div style="margin-top: 50px')
  if (-not $match.Success) { continue }
  $text = [Net.WebUtility]::HtmlDecode([regex]::Replace($match.Groups[1].Value, '<[^>]+>', ' '))
  $text = [regex]::Replace($text, '\s+', ' ').Trim()
  $faq = $text.IndexOf('Frequently Asked Questions', [StringComparison]::OrdinalIgnoreCase)
  if ($faq -ge 0) { $text = $text.Substring(0, $faq) }
$wordPattern = '[A-Za-z0-9][A-Za-z0-9''&/(),:;\-]*'
$boundaryPattern = '[.!?]\s+(?=[A-Z0-9])|\s+(?=\d{1,2}\.\s+[A-Z])'
$output.Add('===== ' + $file.Name + ' =====')

  foreach ($boundary in [regex]::Matches($text, $boundaryPattern)) {
    $offset = $boundary.Index + $boundary.Length
    $remainder = $text.Substring($offset)
    $words = [regex]::Matches($remainder, $wordPattern)
    if ($words.Count -lt 2) { continue }
    $candidateWords = [Collections.Generic.List[string]]::new()
    for ($i = 0; $i -lt [Math]::Min(12, $words.Count); $i++) {
      $word = $words[$i].Value.TrimEnd(',', ';', ':')
      $plain = $word -replace '[^A-Za-z0-9]', ''
      if (-not $plain) { break }
      $lower = $plain.ToLowerInvariant()
      $isFirst = $candidateWords.Count -eq 0
      $isSecond = $candidateWords.Count -eq 1
      if (-not $isFirst -and $stop.Contains($lower)) { break }
      if ($isSecond -and $stop.Contains($lower) -and -not $stop.Contains(($candidateWords[0] -replace '[^A-Za-z0-9]','').ToLowerInvariant())) { break }
      $candidateWords.Add($word)
      if ($i -ge 2 -and $lower -in @('medicine','damage','damages','costs','expenses','charges','care','time','money','compensation','information','examples','errors')) { break }
    }
    if ($candidateWords.Count -ge 2) {
      $candidate = ($candidateWords -join ' ')
      if ($candidate.Length -le 100) { $output.Add($candidate) }
    }
  }
}

[IO.File]::WriteAllLines((Join-Path $PSScriptRoot '.article_heading_candidates.txt'), $output, [Text.UTF8Encoding]::new($false))
