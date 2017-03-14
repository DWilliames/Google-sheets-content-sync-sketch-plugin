// ****************************
//   Checking for updates
// ****************************

// If an update is available - alert the user
// return 'if the user opted to download an update'
function updateIfNeeded() {

  if (isTodayNewDay() && checkPluginUpdate()) {
    var alert = NSAlert.alloc().init()
    alert.setIcon(iconImage)
  	alert.setMessageText("New Update available 🔥")
  	alert.setInformativeText("There's a new update available for '" + manifestJSON.name + "'. Please download and install the new version.")
  	alert.addButtonWithTitle("Download")
    alert.addButtonWithTitle("Cancel")
    if (alert.runModal() == '1000') {
      NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(manifestJSON.homepage))
      return true
    }
  }

  return false
}

// Return if an update has not been checked for today yet
function isTodayNewDay() {

  var lastUpdateCheckDay = defaultsLastUpdateCheckDay
  var formatter = NSDateFormatter.alloc().init()
  formatter.setDateStyle(NSDateFormatterShortStyle)
  var today = formatter.stringFromDate(NSDate.date())

  defaultsLastUpdateCheckDay = today

  saveDefaults(doc.hash())

  if (lastUpdateCheckDay) {
    return lastUpdateCheckDay != today
  } else {
    return true
  }
}

// Check the remote repository for the manifest verion number
// Return whether there is a new update available
function checkPluginUpdate() {
  var newUpdateAvailable = false
  try {
    var response = getJSONFromURL('https://raw.githubusercontent.com/DWilliames/Google-sheets-content-sync-sketch-plugin/master/Google%20sheets%20content%20sync.sketchplugin/Contents/Sketch/manifest.json')
    if (response && response.version) {
      if (response.version.toString() != manifestJSON.version.toString()) {
          newUpdateAvailable = true
      }
    }
  } catch (e) {
    return false
  }
  return newUpdateAvailable
}

// Return a JSON object from a file path
function getJSONFromFile(filePath) {
  var data = NSData.dataWithContentsOfFile(filePath)
  return NSJSONSerialization.JSONObjectWithData_options_error(data, 0, nil)
}

// Return a json object from a URL
function getJSONFromURL(url) {
  var request = NSURLRequest.requestWithURL(NSURL.URLWithString(url))
  var response = NSURLConnection.sendSynchronousRequest_returningResponse_error(request, nil, nil)
  return NSJSONSerialization.JSONObjectWithData_options_error(response, 0, nil)
}
