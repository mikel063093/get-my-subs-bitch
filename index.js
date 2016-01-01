#!/usr/bin/env node
'use strict'
var opensubtitles = require('subtitler'), Token,
  find = require('findit'),
  path = require('path'),
  fs = require('fs')

opensubtitles.api.login()
  .then(onLogin)
  .catch(err => console.log(err))

function onLogin (token) {
  console.log('onLogin')
  Token = token
  getMovieParams()
    .then(function (movie) {
      if (fs.lstatSync(movie.searchPattern).isDirectory()) {
        console.log('isDirectory')
        walkDir(movie.searchPattern, movie)
      }
      if (fs.lstatSync(movie.searchPattern).isFile()) {
        console.log('isFile')
        downloadSubs(movie, token)
          .then(res => onLogOut())
          .catch(onErr)
      }
    })
    .catch(onErr)
}

function getMovieParams () {
  console.log('getMovieParams')
  return new Promise(function (resolve, reject) {
    let userArgs = process.argv.slice(2)
    let searchPattern = userArgs[0]
    let lang = userArgs[1]
    if (searchPattern === undefined) {
      return reject('not movie params')
    }
    let param = {
      searchPattern,
      lang: lang !== undefined ? lang : 'spa'
    }
    return resolve(param)
  })
}

function downloadSubs (movie, token) {
  // console.log('downloadSubs')
  return new Promise(function (resolve, reject) {
    opensubtitles.api.searchForFile(token, movie.lang, movie.searchPattern).done(
      function (results) {
        // if (Array.isArray(results)) {
        //   var arr = results.shift()
        //   console.log(arr)
        // }

        if (!Array.isArray(results)) return reject('results not found')
        opensubtitles.downloader.download(results, 1, movie.searchPattern, null)
        opensubtitles.downloader.on('downloaded', function (mov) {
          console.log('file download on ' + mov.file)
          return resolve(results)
        })
      // opensubtitles.api.logout(token)
      })
  })
}
function walkDir (dr, movie) {
  let finder = find(dr)
  let Files = []
  finder.on('file', function (file, stat) {
    let base = path.extname(file)

    if (base === '.mkv' || base === '.avi') {
      Files.push(file)
    }
  })

  finder.on('end', function () {
    // let it = downloadIterator(Files)
    // while (!it.next().done) {
    //   console.log(it.next().value)
    // }
    let requests = Files.reduce((promiseChain, item) => {
      return promiseChain.then(new Promise((resolve) => {
        let param = {
          searchPattern: item,
          lang: movie.lang
        }
        console.log('start download for ' + item)
        downloadSubsAsync(param, resolve)
      }))
    }, Promise.resolve())

    requests.then(function () {
      console.log('***  is the End Bitch ****')
    // onLogOut()
    })
  })
}
function downloadSubsAsync (item, resolve) {
  downloadSubs(item, Token)
    .then(function (res) {
      resolve()
    })
}

function downloadIterator (array) {
  var nextIndex = 0
  return {
    next: function () {
      return nextIndex < array.length ?
        {value: downloadSubs(array[nextIndex++], Token).then(res => {
            return 'ok'
        }), done: false} : {done: true}
    }
  }
}

function onLogOut () {
  opensubtitles.api.logout(Token)
}

function onErr (err) {
  console.log(err)
  onLogOut()
}
