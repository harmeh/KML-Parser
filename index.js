"use strict";

const chalk = require('chalk');
console.log(chalk.red.bgYellow.bold("|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||"));
console.log(chalk.red.bgYellow.bold("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"));

console.time("timer-all");



const path = "shiraz.kmz";

/////////////////////////////////////////////////////////////
// 1- read kmz/zip file
const fs = require("fs");
fs.readFile(path, (err, data) => {
  if (err) throw err;


  /////////////////////////////////////////////////////////////
  // 2- unzip kmz/zip to kml/xml
  const JSZip = require("jszip");
  const newZip = new JSZip();
  newZip.loadAsync(data, {
    base64: true
  }).then(function (zip) {
    Object.keys(zip.files).forEach(function (filename) {
      zip.file(filename).async('string').then(function (fileData) {


        /////////////////////////////////////////////////////////////
        // Convert kml/xml to kml/JSON objet
        const xml2js = require('xml2js');

        const parser = new xml2js.Parser();
        parser.parseString(fileData, function (err, result) {


          /////////////////////////////////////////////////////////////
          // clean up kml/objet from Style and StyleMap
          kmlCleanup(result);

          function kmlCleanup(result) {

            // part Of kml Object that we began to parse
            const partOfObject = result.kml.Document[0];

            for (const [key, value] of Object.entries(partOfObject)) {
              if (key == 'Style') {
                delete partOfObject.Style;
              }
              if (key == 'StyleMap') {
                delete partOfObject.StyleMap;
              }
            }
          }



          /////////////////////////////////////////////////////////////
          // 4-add Folder name to kml Placemark Description
          AddingFolderNameToPlacemark(result);

          function AddingFolderNameToPlacemark(result) {

            // part Of kml Object that we began to parse
            const partOfObject = result.kml.Document[0].Folder;

            FolderFinder(partOfObject);

            function FolderFinder(partOfObject) {
              for (let i = 0; i < partOfObject.length; i++) {
                let folderName = '';
                for (const [key, value] of Object.entries(partOfObject[i])) {
                  if (key == 'name' && value != null) {
                    folderName = value[0];
                  }
                  // if (key == 'open' && value != null) {}
                  if (key == 'Folder' && value != null) {
                    PlacemarkFinder(folderName, value);
                  }
                  if (key == 'Placemark' && value != null) {
                    addDescriptionToPlacemark(folderName, value);
                  }
                }
                for (const [key, value] of Object.entries(partOfObject[i])) {
                  if (key == 'Folder' && value != null) {
                    FolderFinder(value);
                  }
                }
              }
            }

            function PlacemarkFinder(folderName, partOfObject) {
              for (let i = 0; i < partOfObject.length; i++) {
                for (const [key, value] of Object.entries(partOfObject[i])) {
                  // if (key == 'name' && value != null) {}
                  // if (key == 'open' && value != null) {}
                  if (key == 'Folder' && value != null) {
                    PlacemarkFinder(folderName, value);
                  }
                  if (key == 'Placemark' && value != null) {
                    addDescriptionToPlacemark(folderName, value);
                  }
                }
              }
            }

            function addDescriptionToPlacemark(folderName, value) {
              for (let i = 0; i < value.length; i++) {
                if (value[i].description == null) {
                  value[i].description = [folderName];
                } else {
                  value[i].description = [value[i].description + '/' + folderName];
                }
              }
            }
          }



          /////////////////////////////////////////////////////////////
          // Convert back objet/kml to xml/kml 
          const builder = new xml2js.Builder();
          const newKml = builder.buildObject(result);



          /////////////////////////////////////////////////////////////
          // 6-Convert xml/kml to GeoJSON
          const tj = require("@tmcw/togeojson");
          // node doesn't have xml parsing or a dom. use xmldom
          const DOMParser = require("xmldom").DOMParser;
          const document = new DOMParser().parseFromString(newKml);
          const geojson = tj.kml(document);



          /////////////////////////////////////////////////////////////
          // 8-clean up GeoJSON data from styleUrl
          geoCleanup(geojson);

          function geoCleanup(geojson) {
            // part Of Object that we began to parse
            const partOfObject = geojson.features;
            for (let i = 0; i < partOfObject.length; i++) {
              for (const [key, value] of Object.entries(partOfObject[i])) {
                if (key == 'properties' && value != null) {
                  delete value.styleUrl;
                  delete value.visibility;
                }
              }
            }
          }


          /////////////////////////////////////////////////////////////
          // 10-parse Description to phase-id/asset-type/owner/ for GeoJSON data
          parseDescription(geojson);

          function parseDescription(geojson) {
            // part Of Object that we began to parse
            const partOfObject = geojson.features;
            for (let i = 0; i < partOfObject.length; i++) {
              for (const [key, value] of Object.entries(partOfObject[i])) {
                if (key == 'properties' && value != null) {
                  const d = value.description.split('/');
                  if (d[0]) value.parent = [d[0]];
                  if (d[1]) value.assetType = [d[1]];
                  if (d[2]) value.owner = [d[2]];
                  if (d[3]) value.exploitationRights = [d[3]];
                  if (d[4]) value.level4 = [d[4]];
                  if (d[5]) value.level5 = [d[5]];
                }
              }
            }
          }



          /////////////////////////////////////////////////////////////
          // 7-Save GeoJSON
          const geoJsonDest = path + '-geo.json';
          fs.writeFileSync(geoJsonDest, JSON.stringify(geojson));

        });
      });
    });
  });
});

console.timeEnd("timer-all");
const util = require('util');
console.log(chalk.white.bgRed.bold(util.inspect(`all done`, false, null)));