@import 'defaults.js'
@import 'utilities.js'

var selection, doc, scriptPath, scriptFolder, app
var manifestJSON, iconImage, sheetValues

// Setup variables based on the context
function setup(context) {
  selection = context.selection
  doc = context.document
  scriptPath = context.scriptPath
  scriptFolder = scriptPath.stringByDeletingLastPathComponent()
  app = NSApplication.sharedApplication()

  manifestJSON = getJSONFromFile(scriptFolder + "/manifest.json")
  iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path())

  fetchDefaults(doc.hash())

  // Return the opposite of if it was updated
  return !updateIfNeeded()
}

// ****************************
//   Plugin command handler
// ****************************

function run(context) {
  // If the user opted to update the plugin, then return
  if (!setup(context)) {
    return
  }

  // After presenting the options - if the user cancelled, then return
  if (showOptions() != '1000') {
    return
  }

  // If the user didn't enter a valid URL, tell them, then exit
  var sheetId = validateURL()
  if (!sheetId) {
    var alert = NSAlert.alloc().init()
    alert.setIcon(iconImage)
  	alert.setMessageText("Invalid Google Sheet URL")
  	alert.setInformativeText("The URL you entered wasn't valid")
  	alert.addButtonWithTitle("Ok")
    return alert.runModal()
  }

  // Fetch all the values for the given URL
  fetchSheetValues(sheetId)

  if (sheetValues.length < 1)
    return

  // Update the values for each page
  doc.pages().forEach(page => {

    var sheetTitle = valueFromName(page.name())
    var pageValues = valuesForSheet(sheetTitle)

    // If no sheet title provided - just use the first sheet
    if (sheetTitle == '' || pageValues == null) {
      var firstSheet = sheetValues[0]
      pageValues = firstSheet.values
    }

    page.children().forEach(child => {
      // Only check text layers
      if (!child.isMemberOfClass(MSTextLayer) || child.name().indexOf('#') < 0)
        return

      var nameFormat = formatName(child.name())
      var childName = nameFormat.lookupName
      var values = pageValues[childName]

      // Set the value of the text layer accordingly
      // Based on if it was given an index, otherwise return the first one
      if (values && values.length > 0) {
        var value = (values.length >= nameFormat.index) ? values[nameFormat.index - 1] : 'N/A'
        child.setStringValue(value == '' ? 'N/A' : value)
      } else {
        child.setStringValue('N/A')
      }
    })
  })

  saveDefaults(doc.hash())

  doc.showMessage("Content successfully synced! ⚡︎")

  doc.reloadInspector()
}


// **********************
//   Helper methods
// **********************

// Validate whether the URL contains a valid sheet ID
// Return the SheetID, or null
function validateURL() {
  var regex = /(?:https?:\/\/)?docs\.google\.com\/spreadsheets\/d\/(.*)(\/)/g
  var matches = regex.exec(defaultsURL)
  return (matches && matches.length > 1) ? matches[1] : null
}

// Show the options to the user - to enter their url
function showOptions() {

  var alert = NSAlert.alloc().init()
  alert.setIcon(iconImage)
  alert.setMessageText("Import data from Google Sheet")
  alert.setInformativeText("In your spreadhseet;\nGo 'File > Publish to the web...' \nClick 'Publish' and copy the link from there")
  alert.addButtonWithTitle("Import")
  alert.addButtonWithTitle("Cancel")

  var input = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 300, 54))
  input.setStringValue(defaultsURL)
  input.setPlaceholderString('Google Sheets publish URL')

  alert.setAccessoryView(input)
  var response = alert.runModal()

  input.validateEditing()

  defaultsURL = input.stringValue()

  return response
}

// Split the name up into a format
// Based on the content after '#'
// - lookupName is the value directly after '#', before a '.'
// - index is any value after a '.' after '#'
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

// Get the text after '#'
// Also remove spaces, and make it all lowercase
function valueFromName(name) {
  var split = name.replace(/\s/g, '').toLowerCase().split('#')
  return (split.length > 1) ? split[1] : null
}

// Returns all the spreadsheet values for the sheet, based on the sheetName
function valuesForSheet(sheetName) {
  if (!sheetName) {
    return null
  }

  var sheet = sheetValues.find(sheet => {
    return sheet.title.replace(/\s/g, '').toLowerCase() == sheetName.replace(/\s/g, '').toLowerCase()
  })

  return sheet ? sheet.values : null
}

// For the given Google Sheet ID, fetch all the values for all the sheets within it
function fetchSheetValues(sheetID) {
  sheetValues = []

  // Keep incrementing fo rth enext sheet, until no sheet is found
  for (var i = 1; true; i++) {
    var values = fetchValuesForPage(sheetID, i)
    if (!values) {
      break
    } else {
      // Add the data to the sheetValues
      sheetValues.push(values)
    }
  }
}

// Fetch the values for a given page within a Google Sheet
// Return the parse data
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

// Parse the data to how we want it
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
