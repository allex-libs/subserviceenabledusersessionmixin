function createServiceMixin (execlib, mylib) {
  'use strict';

  function ServiceMixin (prophash) {
    this.userSessionSubservicesConfig = prophash.usersessionsubservicesconfig;
  }
  ServiceMixin.prototype.destroy = function () {
    this.userSessionSubservicesConfig = null;
  }

  ServiceMixin.addMethods = function (klass) {

  };

  mylib.Service = ServiceMixin;
}
module.exports = createServiceMixin;