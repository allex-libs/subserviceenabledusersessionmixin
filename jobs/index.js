function createJobsLib (execlib) {
  'use strict';

  var mylib = {};

  require('./functionalityactivatorcreator')(execlib, mylib);

  return mylib;
}
module.exports = createJobsLib;