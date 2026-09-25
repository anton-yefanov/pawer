Pod::Spec.new do |s|
  s.name           = 'AppLanguage'
  s.version        = '1.0.0'
  s.summary        = 'Reads and writes the per-app language iOS keeps in AppleLanguages'
  s.license        = 'MIT'
  s.author         = 'Pawer'
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
