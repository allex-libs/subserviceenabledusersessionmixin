function createSubServiceEnabledUserSessionMixinLib (execlib) {
  'use strict';
  var ret = execlib.loadDependencies('client', ['allex:sinkacquiring:lib'], creator.bind(null, execlib));
  execlib = null;
  return ret;
}

function creator (execlib, sinkacquiringlib) {
  'use strict';

  var mylib = {
    methoddescriptor: require('./methoddescriptor')
  };
  require('./servicecreator')(execlib, mylib);
  require('./usersessioncreator')(execlib, sinkacquiringlib, mylib);

  return mylib;
}
module.exports = createSubServiceEnabledUserSessionMixinLib;
