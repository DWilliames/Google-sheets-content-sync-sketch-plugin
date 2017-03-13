
var defaultsKey = "com.davidwilliames.sketch-plugins.google-sheets-content-sync"

var defaults = {
  url: '',
  lastUpdateCheckDay: 0
}

function fetchDefaults() {
  var newDefaults = NSUserDefaults.standardUserDefaults().dictionaryForKey(defaultsKey)
  if(newDefaults != null) {
    defaults = newDefaults
  }
}

function saveDefaults(newValue) {
  defaults = newValue
  NSUserDefaults.standardUserDefaults().setObject_forKey(defaults, defaultsKey)
  NSUserDefaults.standardUserDefaults().synchronize()
}
