Pod::Spec.new do |s|
  s.name           = 'AppTint'
  s.version        = '1.0.0'
  s.summary        = 'Sets the key window tint to the chosen accent'
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
