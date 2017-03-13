@import 'defaults.js'

var selection
var doc
var scriptFolder
var scriptPath
var app
var manifestJSON

var iconImage
var sheetValues
var url

// Setup variables based on the context
function setup(context) {
  doc = context.document
  selection = context.selection
  iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icons/icon.png").path())

  scriptPath = context.scriptPath
  scriptFolder = scriptPath.stringByDeletingLastPathComponent()
  app = NSApplication.sharedApplication()

  manifestJSON = getJSONFromFile(scriptFolder + "/manifest.json")

  fetchDefaults()
  url = defaults.url

  if (isTodayNewDay() && checkPluginUpdate()) {
    var alert = NSAlert.alloc().init()
    alert.setIcon(iconImage)
  	alert.setMessageText("New Update available 🔥")
  	alert.setInformativeText("There's a new update available for '" + manifestJSON.name + "'. Please download and install the new version.")
  	alert.addButtonWithTitle("Download")
    alert.addButtonWithTitle("Cancel")
    if (alert.runModal() == '1000') {
      NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(manifestJSON.homepage))
      return false
    }
  }

  return true
}

function isTodayNewDay() {

  var lastUpdateCheckDay = defaults.lastUpdateCheckDay
  lastUpdateCheckDay = 0

  var formatter = NSDateFormatter.alloc().init()
  formatter.setDateStyle(NSDateFormatterShortStyle)
  var today = formatter.stringFromDate(NSDate.date())

  saveDefaults({
    url: url,
    lastUpdateCheckDay: today
  })

  if (lastUpdateCheckDay) {
    return lastUpdateCheckDay != today
  } else {
    return true
  }
}

function checkPluginUpdate() {
  var newUpdateAvailable = false
  try {
    var response = getJSONFromURL('https://raw.githubusercontent.com/einancunlu/Checkpoints-Plugin-for-Sketch/master/Checkpoints.sketchplugin/Contents/Sketch/manifest.json')
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

function getJSONFromFile(filePath) {
  var data = NSData.dataWithContentsOfFile(filePath)
  return NSJSONSerialization.JSONObjectWithData_options_error(data, 0, nil)
}

function getJSONFromURL(url) {
  var request = NSURLRequest.requestWithURL(NSURL.URLWithString(url))
  var response = NSURLConnection.sendSynchronousRequest_returningResponse_error(request, nil, nil)
  return NSJSONSerialization.JSONObjectWithData_options_error(response, 0, nil)
}



// ****************************
//   Plugin command handlers
// ****************************

function run(context) {
  if (!setup(context)) {
    return
  }

  if (showOptions() != '1000') {
    return
  }

  var sheetId = validateURL()
  if (!sheetId) {
    var alert = NSAlert.alloc().init()
    alert.setIcon(iconImage)
  	alert.setMessageText("Invalid Google Sheet URL")
  	alert.setInformativeText("The URL you entered wasn't valid")
  	alert.addButtonWithTitle("Ok")
    return alert.runModal()
  }

  fetchSheetValues(sheetId)

  if (sheetValues.length < 1)
    return

  doc.pages().forEach(page => {

    var sheetTitle = valueFromName(page.name())
    var pageValues = valuesForSheet(sheetTitle)

    if (sheetTitle == '' || pageValues == null) {
      var firstSheet = sheetValues[0]
      pageValues = firstSheet.values
    }

    page.children().forEach(child => {
      if (!child.isMemberOfClass(MSTextLayer))
        return

      var nameFormat = formatName(child.name())
      var childName = nameFormat.lookupName
      var values = pageValues[childName]

      if (values && values.length > 0) {
        var value = (values.length >= nameFormat.index) ? values[nameFormat.index - 1] : 'N/A'
        child.setStringValue(value == '' ? 'N/A' : value)
      } else {
        child.setStringValue('N/A')
      }
    })
  })

  saveDefaults({
    url: url,
    lastUpdateCheckDay: defaults.lastUpdateCheckDay
  })

  doc.reloadInspector()
}


function validateURL() {
  var regex = /(?:https?:\/\/)?docs\.google\.com\/spreadsheets\/d\/(.*)(\/)/g
  var matches = regex.exec(url)
  return (matches && matches.length > 1) ? matches[1] : null
}

function showOptions() {

  var alert = NSAlert.alloc().init()
  alert.setIcon(iconImage)
  alert.setMessageText("Import data from Google Sheet")
  alert.setInformativeText("In your spreadhseet;\nGo 'File > Publish to the web...' \nClick 'Publish' and copy the link from there")
  alert.addButtonWithTitle("Import")
  alert.addButtonWithTitle("Cancel")

  var input = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 300, 54))
  input.setStringValue(url)
  input.setPlaceholderString('Google Sheets publish URL')

  alert.setAccessoryView(input)
  var response = alert.runModal()

  input.validateEditing()

  url = input.stringValue()

  return response
}

function formatName(name) {
  // TODO: portion — for carry over text
  var format = {
    lookupName: undefined,
    index: 1
  }
  // Remove spaces
  name = name.replace(/\s/g, '').toLowerCase()

  var split = name.split('#')
  if (split.length <= 1)
    return format

  split = split[1].split('.')
  if (split.length > 1) {
    format.index = parseInt(split[1])
  }
  format.lookupName = split[0]

  return format
}

function valueFromName(name) {
  var split = name.replace(/\s/g, '').toLowerCase().split('#')
  return (split.length > 1) ? split[1] : null
}


function valuesForSheet(sheetName) {
  if (!sheetName) {
    return null
  }

  var sheet = sheetValues.find(sheet => {
    return sheet.title.replace(/\s/g, '').toLowerCase() == sheetName.replace(/\s/g, '').toLowerCase()
  })

  if (sheet) {
    return sheet.values
  }

  return null
}

function fetchSheetValues(sheetID) {
  sheetValues = []

  for (var i = 1; true; i++) {
    var values = fetchValuesForPage(sheetID, i)
    if (!values) {
      break
    } else {
      sheetValues.push(values)
    }
  }
}

function fetchValuesForPage(sheetID, pageNumber) {
  var queryURL = 'https://spreadsheets.google.com/feeds/list/' + sheetID + '/' + pageNumber + '/public/values?alt=json'

  var request = NSMutableURLRequest.new()
  request.setHTTPMethod('GET')
  request.setURL(NSURL.URLWithString(queryURL))

  var error = NSError.new()
  var responseCode = null
  var response = NSURLConnection.sendSynchronousRequest_returningResponse_error(request, responseCode, error)

  var dataString = NSString.alloc().initWithData_encoding(response, NSUTF8StringEncoding)

  try {
    var data = JSON.parse(dataString)
    return parseData(data)
  } catch(e) {
    // Page doesn't exist
    return null
  }
}

function parseData(data) {
  var values = {}

  data.feed.entry.forEach(entry => {
    Object.keys(entry).filter(key => {
      return key.indexOf('gsx$') == 0
    }).forEach(key => {
      var newKey = key.substring(4)
      if (!(values.hasOwnProperty(newKey))) {
        values[newKey] = []
      }

      var newValue = entry[key]['$t']
      if (newValue) {
        var currentArray = values[newKey]
        currentArray.push(newValue)
        values[newKey] = currentArray
      }
    })
  })
  return {
    title: data.feed.title.$t,
    values: values
  }
}
