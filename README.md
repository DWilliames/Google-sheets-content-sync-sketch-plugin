# Google Sheets content sync — Sketch Plugin

<a href="https://www.sketchapp.com">
  <img width="160" height="41" src="images/sketch-badge.png" >
</a>
<a href="http://bit.ly/SketchRunnerWebsite">
  <img width="160" height="41" src="http://sketchrunner.com/img/badge_blue.png" >
</a>

Edit and collaborate on your content in Google Sheets, then sync in back to your sketch files.
![Demo](images/demo.gif)

## Usage

##### Create your Spreadsheet

Create a new Google Spreadsheet (unfortunately Google Docs won't work with this.)

Enter you content going horizontally, with the titles on the first line, and the values directly below. **It is very important that you do it this way**

![Layout example](images/layout.png)

##### Publish the sheet

Next you need to publish the document, so that Sketch can read it's contents via the shareable link.

Do this by going `File > Publish to the web... > Publish`
![Publish example](images/publish-demo.gif)

##### Syncing values to Text Layers

Now that the spreadsheet is accessible — how do you tie specific values to text layers.

In the name of a text layer, add a '#' followed by the title in the spreadsheet.

For example: to tie the value of 'message' to a Text Layer, give it a name like `text #message`

> It is not case-sensitive, and will ignore spaces — so `text #anothertitle` will still get the value for `Another Title`


## Why make this plugin?

This is great for collaborating on content heavy documents, or when you may have a copywriter you work with.

There has been numerous times that I have been working on a large document with others, where we would collaborate in a Google doc. Then I would continually copy that content back into my Sketch design. This can be very frustrating after multiple iterations — when you think you're done with the content, so you copy it all into Sketch; then more updates are made, and you have to copy them all again. 😡

This plugin really saves the day in that regard — and has saved me a ton of time. 😍

Another use case, is having different versions of text across different sheets, to easily change between them.


## Installation

1. Download the plugin
2. Double-click the file, 'Google sheets content sync.sketchplugin'
3. That's it...


## Contribute

This plugin is in active development.

Pull requests are welcome and please submit bugs 🐛.

## Contact

* Email <david@williames.com>
* Follow [@davidwilliames](https://twitter.com/davidwilliames) on Twitter

[![Twitter Follow](https://img.shields.io/twitter/follow/davidwilliames.svg?style=social&label=Follow)]()

---

Check out my other Sketch Plugins:
* [Nudge Resize](https://github.com/DWilliames/nudge-resize-sketch-plugin)
* [Nudge Corner Radius](https://github.com/DWilliames/nudge-corner-radius-sketch-plugin)
* [📕 PDF Export](https://github.com/DWilliames/PDF-export-sketch-plugin)

If you find this plugin helpful, consider shouting me coffee ☕️ via [PayPal](https://www.paypal.me/dtw/5)

<a href="https://www.paypal.me/dtw/5">
  <img width="160" height="41" src="images/paypal-badge.png" >
</a>
