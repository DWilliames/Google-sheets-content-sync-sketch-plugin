@import 'utilities.js'

var selection, doc, scriptPath, scriptFolder, app
var iconImage, sheetValues

// Saving and receiving document URL
var docData, command, pluginIdentifier, url

var appVersion, plugin

// Setup variables based on the context
function setup(context) {
  selection = context.selection
  doc = context.document
  scriptPath = context.scriptPath
  scriptFolder = scriptPath.stringByDeletingLastPathComponent()
  app = NSApplication.sharedApplication()
  plugin = context.plugin

  iconImage = NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path())

  appVersion = MSApplicationMetadata.metadata().appVersion

  docData = context.document.documentData()
  command = context.command;

  pluginIdentifier = context.plugin.identifier()

  url = command.valueForKey_onLayer_forPluginIdentifier('docURL', docData, pluginIdentifier)
  if (!url) {
    url = ''
  }

}

// ****************************
//   Plugin command handler
// ****************************

function run(context) {
  setup(context)

  // Ask the user to update their URL, then sync the content
  if (updateSheetURL())
    syncContent()
}

function importContent(context) {
  setup(context)

  // If there's currently no valid URL — ask the user to update it, then import it
  if (!validateURL()) {
    if (updateSheetURL())
      syncContent()
  } else {
    syncContent()
  }
}

function updateSheetURL() {
  // After presenting the options - return whether the user clicked 'import' or not
  return showOptions() == '1000'
}

// The actual work!!
// Fetch the content from the Sheets URL
// Update the values accordingly
function syncContent() {

  print('Importing content from: ' + url)

  // If the user didn't enter a valid URL, tell them, then exit
  var sheetId = validateURL()

  if (!sheetId) {
    var alert = NSAlert.alloc().init()
    alert.setIcon(iconImage)
    alert.setMessageText("Invalid Google Sheet URL")
    alert.setInformativeText("The URL you entered wasn't valid")
    alert.addButtonWithTitle("Ok")
    return alert.runModal()

  } else if (sheetId == "e") {

    var alert = NSAlert.alloc().init()
    alert.setIcon(iconImage)
    alert.setMessageText("Invalid Google Sheet URL")
    alert.setInformativeText("It looks like you've used the URL generated on the 'Publish to the web' screen. \n\nWhilst it is important that you do 'publish' the spreadsheet to the web, you need to use the URL for the spreadsheet that is in the browser address bar instead.")
    alert.addButtonWithTitle("Ok")
    return alert.runModal()
  }

  // Fetch all the values for the given URL
  fetchSheetValues(sheetId)

  if (sheetValues.length < 1)
    return

  // Update the values for each page
  doc.pages().forEach(function (page) {

    var sheetTitle = valueFromName(page.name())
    var pageValues = valuesForSheet(sheetTitle)

    // If no sheet title provided - just use the first sheet
    if (sheetTitle == '' || pageValues == null) {
      var firstSheet = sheetValues[0]
      pageValues = firstSheet.values
    }

    page.children().forEach(function (child) {
      if (child.isMemberOfClass(MSSymbolInstance)) {

        // Store new overrides that need to be made
        var overrides = {}


        child.symbolMaster().children().forEach(function (symbolLayer) {
          // Ignore layers that are not text layers or shapes
          // Only include layers that have a '#' in the name
          if (!(symbolLayer.isMemberOfClass(MSTextLayer) || canLayerHaveFill(symbolLayer)) || symbolLayer.name().indexOf('#') < 0) {
            return
          }


          var objectID = symbolLayer.objectID().toString()
          var existingOverrides = child.overrides()
          if (existingOverrides == null) {
            // no overrides exist, add one
            child.overrides = { objectID: "overrideText" }
            existingOverrides = child.overrides()
          }

          // get the existing overrides and create a mutable copy
          var mutableOverrides = NSMutableDictionary.dictionaryWithDictionary(existingOverrides)
          mutableOverrides.setObject_forKey(NSMutableDictionary.dictionaryWithDictionary(existingOverrides.objectForKey(0)), 0)

          var nameFormat = formatName(symbolLayer.name())
          var childName = nameFormat.lookupName
          var values = pageValues[childName]

          // Get the index from the name of the Symbol instance. e.g. '.3'
          var instanceIndex = indexFromName(child.name())
          // Set the overrides to match the index of the instance name
          if (instanceIndex && instanceIndex != nameFormat.index) {
            nameFormat.index = instanceIndex
          }

          var index = nameFormat.index.toString()
          if (index.toLowerCase() === 'n' || index.toLowerCase() === 'x') {
            index = Math.floor(Math.random() * values.length) + 1
          } else {
            index = parseInt(index)
          }

          // If there's no value associated, skip it
          if (!values || values.length < 1) {
            return
          }

          // Set the value of the text layer accordingly
          // Based on if it was given an index, otherwise return the first one
          var value = (values.length >= index) ? values[index - 1] : ''
          var textValue = value || ''

          if (symbolLayer.isMemberOfClass(MSTextLayer)) {
            mutableOverrides.setObject_forKey(textValue, objectID)

          } else if (canLayerHaveFill(symbolLayer)) {
            var imageURL = imageURLFromValue(value)
            if (imageURL) {
              var imageData = getImageDataFromURL(imageURL)
              mutableOverrides.setObject_forKey(imageData, objectID)
            }

          }

          child.overrides = mutableOverrides

        })
      }

      // Only check text layers or shape layers
      // Only include layers that have a '#' in the name
      if (!(child.isMemberOfClass(MSTextLayer) || canLayerHaveFill(child)) || child.name().indexOf('#') < 0)
        return


      var nameFormat = formatName(child.name())
      var childName = nameFormat.lookupName
      var values = pageValues[childName]

      // If there's no value associated, skip it
      if (!values || values.length < 1) {
        return
      }

      var index = nameFormat.index.toString()
      if (index.toLowerCase() === 'n' || index.toLowerCase() === 'x') {
        index = Math.floor(Math.random() * values.length) + 1
      } else {
        index = parseInt(index)
      }

      // Set the value of the text layer accordingly
      // Based on if it was given an index, otherwise return the first one
      var value = (values.length >= index) ? values[index - 1] : ''
      var textValue = value || ''

      if (child.isMemberOfClass(MSTextLayer)) {
        child.setStringValue(textValue)
      } else if (canLayerHaveFill(child)) {
        // Get an image URL for the shape
        var imageURL = imageURLFromValue(value)
        if (imageURL) {
          var imageData = getImageDataFromURL(imageURL)
          fillLayerWithImageData(child, imageData)
        }
      }
    })
  })


  command.setValue_forKey_onLayer_forPluginIdentifier(url, 'docURL', docData, pluginIdentifier)

  doc.showMessage("Content successfully imported! ⚡️")

  doc.reloadInspector()
}


// **********************
//   Helper methods
// **********************

// Validate whether the URL contains a valid sheet ID
// Return the SheetID, or null
function validateURL() {
  if (url === '') {
    return null
  }

  var regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/g
  var matches = regex.exec(url)
  return (matches && matches.length > 1) ? matches[1] : null
}

// Validate if there's a URL for the image as the value in the sheet
function imageURLFromValue(value) {
  if (value === '') {
    return null
  }

  var regex = /(https?:\/\/.*\.(?:png|jpg|jpeg))/i
  var matches = regex.exec(value)
  return (matches && matches.length > 1) ? matches[1] : null
}

// Downloads an image from a URL and returns it as a NSImageData
function getImageDataFromURL(url) {

  var request = NSURLRequest.requestWithURL(NSURL.URLWithString(url))
  var data = NSURLConnection.sendSynchronousRequest_returningResponse_error(request, null, null)

  var image

  if (!data) {
    print('Error fetching image')
    doc.showMessage("Error in fetching image URL.")
    image = NSImage.alloc().initByReferencingFile(plugin.urlForResourceNamed("Placeholder.png").path())
  } else {
    image = NSImage.alloc().initWithData(data)
  }


  if (isCurrentVersionBefore('47')) {
    return MSImageData.alloc().initWithImage_convertColorSpace(image, false)
  }

  return MSImageData.alloc().initWithImage(image)
}

// Changes the fill of a layer to be the NSImageData passed in
function fillLayerWithImageData(layer, imageData) {
  var fill = layer.style().fills().firstObject()

  fill.setFillType(4)
  fill.setImage(imageData)
  fill.setPatternFillType(1)
}

// Show the options to the user - to enter their url
function showOptions() {

  var alert = NSAlert.alloc().init()
  alert.setIcon(iconImage)
  alert.setMessageText("Import data from Google Sheet")
  alert.setInformativeText("In your spreadsheet;\nGo 'File > Publish to the web...' \nClick 'Publish' and then copy the URL from the address bar.\n\nNOTE: Do not use the URL on the 'Publish to the web' page — use the URL from the browser address bar.")
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
    format.index = split[1]
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

// Get the text after '.'
// Also remove spaces, and make it all lowercase
function indexFromName(name) {
  var split = name.replace(/\s/g, '').toLowerCase().split('.')
  return (split.length > 1) ? split[1] : null
}

// Returns all the spreadsheet values for the sheet, based on the sheetName
function valuesForSheet(sheetName) {
  if (!sheetName) {
    return null
  }

  var sheet = sheetValues.find(function (sheet) {
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
  } catch (e) {
    doc.showMessage("Failed to process the document data correctly")
    return null
  }
}

// Parse the data to how we want it
function parseData(data) {
  var values = {}

  data.feed.entry.forEach(function (entry) {
    Object.keys(entry).filter(function (key) {
      return key.indexOf('gsx$') == 0
    }).forEach(function (key) {
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


function compareVersion(a, b) {
  var i, cmp, len, re = /(\.0)+[^\.]*$/;
  a = (a + '').replace(re, '').split('.');
  b = (b + '').replace(re, '').split('.');
  len = Math.min(a.length, b.length);
  for (i = 0; i < len; i++) {
    cmp = parseInt(a[i], 10) - parseInt(b[i], 10);
    if (cmp !== 0) {
      return cmp;
    }
  }
  return a.length - b.length;
}

function isCurrentVersionBefore(version) {
  return compareVersion(appVersion, version) < 0
}

function canLayerHaveFill(layer) {
  if (isCurrentVersionBefore("52")) {
    return layer.isMemberOfClass(MSShapeGroup)
  } else {
    return layer.isKindOfClass(MSShapePathLayer)
  }
}
