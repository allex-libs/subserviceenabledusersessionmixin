function createFunctionalityActivatorJob (execlib, mylib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    JobOnDestroyable = qlib.JobOnDestroyable,
    execSuite = execlib.execSuite;

  function ServiceRepresentation (servicesink) {
    lib.Destroyable.call(this);
    if (!(servicesink && servicesink.destroyed)) {
      this.destroy(new lib.Error('ALREADY_DESTROYED', 'SuperSink already destroyed'));
      return;
    }
    this.serviceSink = servicesink;
    this.serviceSinkDestroyedListener = this.serviceSink.destroyed.attach(this.onServiceSinkDestroyed.bind(this));
    this.userSink = null;
    this.userSinkDestroyedListener = null;
  }
  lib.inherit(ServiceRepresentation, lib.Destroyable);
  ServiceRepresentation.prototype.__cleanUp = function () {
    if (this.userSinkDestroyedListener) {
      this.userSinkDestroyedListener.destroy();
    }
    this.userSinkDestroyedListener = null;
    if (this.userSink) {
      this.userSink.destroy();
    }
    this.userSink = null;
    if (this.serviceSinkDestroyedListener) {
      this.serviceSinkDestroyedListener.destroy();
    }
    this.serviceSinkDestroyedListener = null;
    if (this.serviceSink) {
      this.serviceSink.destroy();
    }
    this.serviceSink = null;
    lib.Destroyable.prototype.__cleanUp.call(this);
  };
  ServiceRepresentation.prototype.invoke = function (methodname, params) {
    if (!this.userSink){
      return q.reject(new lib.Error('ALREADY_DESTROYED', 'UserSink already destroyed'));
    }
    var methodwithparams = params.slice();
    methodwithparams.unshift(methodname);
    return this.userSink.call.apply(this.userSink, methodwithparams);
  };
  ServiceRepresentation.prototype.getUserSink = function () {
    if (!this.serviceSink) {
      return q.reject(new lib.Error('ALREADY_DESTROYED', 'ServiceSink already destroyed'));
    }
    return this.serviceSink.subConnect('.', {name: 'user', role: 'user'}).then(
      this.onUserSink.bind(this)
    );
  };
  ServiceRepresentation.prototype.onUserSink = function (usersink) {
    var exc;
    if (!this.serviceSink) {
      usersink.destroy();
      throw new lib.Error('ALREADY_DESTROYED', 'ServiceSink already destroyed');
    }
    if (!(usersink && usersink.destroyed)) {
      exc = new lib.Error('ALREADY_DESTROYED', 'UserSink already destroyed');
      this.destroy(exc);
      throw exc;
    }
    this.userSink = usersink;
    this.userSinkDestroyedListener = this.userSink.destroyed.attach(this.onUserSinkDestroyed.bind(this));
  };
  ServiceRepresentation.prototype.onServiceSinkDestroyed = function (exc) {
    if (this.serviceSinkDestroyedListener) {
      this.serviceSinkDestroyedListener.destroy();
    }
    this.serviceSinkDestroyedListener = null;
    this.serviceSink = null;
    this.destroy(exc);
  };
  ServiceRepresentation.prototype.onUserSinkDestroyed = function (exc) {
    if (this.userSinkDestroyedListener) {
      this.userSinkDestroyedListener.destroy();
    }
    this.userSinkDestroyedListener = null;
    this.userSink = null;
    this.getUserSink();
  };
  
  function FunctionalityActivatorJob (session, functionalityname, defer) {
    JobOnDestroyable.call(this, session, defer);
    this.functionalityname = functionalityname;
    this.functionalityRepresentation = null;    
  }
  lib.inherit(FunctionalityActivatorJob, JobOnDestroyable);
  FunctionalityActivatorJob.prototype.destroy = function () {
    this.functionalityRepresentation = null;
    this.functionalityname = null;
    JobOnDestroyable.prototype.destroy.call(this);
  };
  FunctionalityActivatorJob.prototype._destroyableOk = function () {
    var ret = JobOnDestroyable.prototype._destroyableOk.call(this);
    if (!ret) {
      return ret;
    }
    return this.destroyable.jobs && this.destroyable.functionalities && this.destroyable.functionalityconfigs;
  };
  FunctionalityActivatorJob.prototype.go = function () {
    var ok = this.okToGo(), fncs;
    if (!ok.ok) {
      return ok.val;
    }
    if (this.destroyable.functionalities._instanceMap.get(this.functionalityname)){
      this.resolve(this.functionalityname);
      return;
    }
    if (this.destroyable.mutexfunctionalities) {
      fncs = this.destroyable.functionalities;
      fncs.traverse(function (svc, svcname) {
        fncs.unregisterDestroyable(svcname);
      });
      fncs = null;
    }
    var config = this.destroyable.getFunctionalityConfiguration(this.functionalityname);
    if (!config) {
      this.reject(new lib.Error('FUNCTIONALITY_DOES_NOT_EXIST', this.functionalityname))
    }
    execSuite.start({
      service: {
        modulename: config.modulename,
        propertyhash: config.propertyhash,
        roleremapping: config.roleremapping||{}
      }
    }).then(
      this.onStarted.bind(this),
      this.reject.bind(this)
    );
    return ok.val;
  };
  FunctionalityActivatorJob.prototype.onStarted = function (servicesink) {
    if (!this.okToProceed()) {
      servicesink.destroy();
      return;
    }
    try {
      this.functionalityRepresentation = new ServiceRepresentation(servicesink);
      this.functionalityRepresentation.getUserSink().then(
        this.onRepresentationDone.bind(this),
        this.reject.bind(this)
      );
    }
    catch (e) {
      this.reject(e);
    }
  };
  FunctionalityActivatorJob.prototype.onRepresentationDone = function () {
    var fp = this.functionalityRepresentation;
    if (!this.okToProceed()) {
      if (fp) {
        fp.destroy();
      }
      return;
    }
    this.destroyable.functionalities.registerDestroyable(this.functionalityname, this.functionalityRepresentation);
    this.resolve(this.functionalityname);
  };


  mylib.FunctionalityActivator = FunctionalityActivatorJob;
}
module.exports = createFunctionalityActivatorJob;