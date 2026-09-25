import ExpoModulesCore
import Foundation

private let key = "AppleLanguages"

public class AppLanguageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppLanguage")

    // Read from the app's own domain rather than Locale.preferredLanguages:
    // that one is cached for the life of the process, so it would still report
    // the old language after a JS reload. Settings › Pawer › Language writes
    // this same key, so the two stay in agreement.
    Function("getOverride") { () -> String? in
      guard let bundleId = Bundle.main.bundleIdentifier,
            let languages = UserDefaults.standard.persistentDomain(forName: bundleId)?[key] as? [String]
      else { return nil }
      return languages.first
    }

    Function("setOverride") { (code: String?) in
      if let code {
        UserDefaults.standard.set([code], forKey: key)
      } else {
        UserDefaults.standard.removeObject(forKey: key)
      }
    }
  }
}
