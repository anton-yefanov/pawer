import ExpoModulesCore
import UIKit

public class AppTintModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppTint")

    Function("setTint") { (color: UIColor) in
      DispatchQueue.main.async {
        // Every window, not just the key one: alerts and sheets present in
        // their own, and a scene may not be key yet when the preference loads.
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
          for window in scene.windows {
            window.tintColor = color
          }
        }
      }
    }
  }
}
