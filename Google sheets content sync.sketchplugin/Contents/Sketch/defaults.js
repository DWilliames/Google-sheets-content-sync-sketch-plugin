// ******************************
//   Saving and retrieving data
// ******************************

var defaultsKey = "com.davidwilliames.sketch-plugins.google-sheets-content-sync"

var defaultsURL = ''
var defaultsLastUpdateCheckDay = 0

function fetchDefaults(documentID) {
  var allDefaults = NSUserDefaults.standardUserDefaults().dictionaryForKey(defaultsKey)

  if (allDefaults) {
    if (allDefaults.lastUpdateCheckDay) {
      defaultsLastUpdateCheckDay = allDefaults.lastUpdateCheckDay
    }
    if (allDefaults[documentID]) {
      defaultsURL = allDefaults[documentID]
    }
  }
}

function saveDefaults(documentID) {
  var allDefaults = NSUserDefaults.standardUserDefaults().dictionaryForKey(defaultsKey)

  var newDefaults = {
    lastUpdateCheckDay: defaultsLastUpdateCheckDay,
    [documentID]: defaultsURL
  }

  for (var key in allDefaults) {
    if (key != 'lastUpdateCheckDay' && key != documentID) {
      newDefaults[key] = allDefaults[key]
    }
  }

  NSUserDefaults.standardUserDefaults().setObject_forKey(newDefaults, defaultsKey)
  NSUserDefaults.standardUserDefaults().synchronize()
}
