function createSessionMixin (execlib, sinkacquiringlib, mylib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    FuncHolderMixin = sinkacquiringlib.FunctionalityHolderMixin;

  function UserSessionMixin (sessionuser) {
    var txt, cfg, ssc;
    if (!(sessionuser && sessionuser.__service)) {
      return;
    }
    if (!sessionuser.__service.userSessionSubservicesConfig) {
      txt = 'prophash for my Service '+sessionuser.__service.constructor.name+' must have a "usersessionsubservicesconfig" object';
      console.error(txt);
      throw new lib.Error('NO_USERSESSION_SUBSERVICESCONFIG', txt);
    }
    cfg = sessionuser.__service.userSessionSubservicesConfig;
    if (!lib.isArray(cfg.functionalities)) {
      txt = 'prophash for my Service '+sessionuser.__service.constructor.name+' must have "subservices" as an Array of "name","config" Objects';
      console.error(txt);
      throw new lib.Error('NO_FUNCTIONALITIES_IN_USERSESSION_SUBSERVICESCONFIG', txt);
    }
    FuncHolderMixin.call(this, cfg);
  }
  UserSessionMixin.prototype.destroy = function () {
    FuncHolderMixin.prototype.destroy.call(this);
  };
  UserSessionMixin.prototype.activateFunctionality = function (functionalityname, defer) {
    qlib.promise2defer(this.queueInvokeFuncOnFunctionality(functionalityname, this, function (sink, dfr) {
      dfr.resolve(!!sink);
    }), defer);
  };
  function onSinkExecutor (methodname, params, sink, defer) {
    var allparams = [methodname];
    Array.prototype.push.call(allparams, params);
    qlib.promise2defer(sink.call.apply(sink, allparams), defer);
  }
  UserSessionMixin.prototype.executeOnFunctionality = function (functionalityname, methodname, params, defer) {
    qlib.promise2defer(this.queueInvokeFuncOnFunctionality(functionalityname, this, onSinkExecutor.bind(null, methodname, params)), defer);
    methodname = null;
    params = null;
  };
  function sinkFromArgumentsMulti (args, index) {
    //args:
    //0 => sinkindex
    //1 => methodname
    //2 => params
    //3 => sink0
    //length-2 => sinkN
    //length-1 => defer
    if (index+3>args.length-1) {
      throw new lib.Error('PARAMETER_COUNT_MISMATCH', index+' should have been '+args.length-4+' at most');
    }
    return args[index+3];
  }
  function onMultiSinkExecutor (sinkindex, methodname, params) { //sink0, sink1, ..., sinkN, defer
    var allparams = [methodname], defer, sink;
    defer = arguments[arguments.length-1];
    try {
      sink = sinkFromArgumentsMulti(arguments, sinkindex);
    } catch(e) {
      defer.reject(e);
      return;
    }
    Array.prototype.push.call(allparams, params);
    qlib.promise2defer(sink.call.apply(sink, allparams), defer);
  }
  UserSessionMixin.prototype.executeOnMultiFunctionality = function (functionalityname, sinkindex, methodname, params, defer) {
    qlib.promise2defer(this.queueInvokeFuncOnFunctionality(functionalityname, this, onMultiSinkExecutor.bind(null, sinkindex, methodname, params)), defer);
    methodname = null;
    params = null;
  };  
  function onSinkSessionExecutor (methodname, params, sink, defer) {
    console.log('invokeSessionMethod', methodname);
    taskRegistry.run('invokeSessionMethod',{
      sink: sink,
      methodname: methodname,
      params: params,
      /*
      onSuccess: function (res) {
        console.log('result for', methodname, res);
        defer.resolve(res);
      },
      onError: function (reason) {
        console.error('error for', methodname, reason);
        defer.reject(reason);
      },
      */
      onSuccess: defer.resolve.bind(defer),
      onError: defer.reject.bind(defer)
    });
  }
  UserSessionMixin.prototype.executeOnFunctionalitySession = function (functionalityname, methodname, params, defer) {
    qlib.promise2defer(
      this.queueInvokeFuncOnFunctionality(functionalityname, this, onSinkSessionExecutor.bind(null, methodname, params)),
      defer
    );
    methodname = null;
    params = null;
  };
  function onMultiSinkSessionExecutor (sinkindex, methodname, params) { //sink0, sink1, ..., sinkN, defer
    var allparams = [methodname], defer, sink;
    defer = arguments[arguments.length-1];
    try {
      sink = sinkFromArgumentsMulti(arguments, sinkindex);
    } catch(e) {
      defer.reject(e);
      return;
    }
    taskRegistry.run('invokeSessionMethod',{
      sink: sink,
      methodname: methodname,
      params: params,
      onSuccess: defer.resolve.bind(defer),
      onError: defer.reject.bind(defer)
    });
  }
  UserSessionMixin.prototype.executeOnMultiFunctionalitySession = function (functionalityname, sinkindex, methodname, params, defer) {
    qlib.promise2defer(
      this.queueInvokeFuncOnFunctionality(functionalityname, this, onMultiSinkSessionExecutor.bind(null, sinkindex, methodname, params)),
      defer
    );
    methodname = null;
    params = null;
  };

  UserSessionMixin.addMethods = function (klass) {
    FuncHolderMixin.addMethods(klass);
    lib.inheritMethods(klass, UserSessionMixin
      ,'activateFunctionality'
      ,'executeOnFunctionality'
      ,'executeOnFunctionalitySession'
    );
  };


  mylib.UserSession = UserSessionMixin;
}
module.exports = createSessionMixin;
