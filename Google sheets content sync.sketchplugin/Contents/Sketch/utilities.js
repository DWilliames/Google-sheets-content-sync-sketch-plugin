// Return a JSON object from a file path
function getJSONFromFile(filePath) {
  var data = NSData.dataWithContentsOfFile(filePath)
  return NSJSONSerialization.JSONObjectWithData_options_error(data, 0, nil)
}
