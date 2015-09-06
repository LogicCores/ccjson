
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                self.toString = function () {
                    var obj = {};
                    LIB._.merge(obj, LIB._.cloneDeep(self.__proto__));
                    LIB._.merge(obj, LIB._.cloneDeep({
                        config: instanceConfig
                    }));
                    return obj;
                }
                self.getAt = function (path) {
                    var obj = {};
                    LIB._.merge(obj, LIB._.cloneDeep(self.__proto__.config));
                    LIB._.merge(obj, LIB._.cloneDeep(instanceConfig));
                    return LIB.traverse(obj).get(path);
                }
            }
            Entity.prototype._entity = "01-EntityImplementation/entity";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
