
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                
                function getConfig () {
                }
                
                self.toString = function () {
                    var obj = {};
                    LIB._.merge(obj, LIB._.cloneDeep(self.__proto__));
                    LIB._.merge(obj, LIB._.cloneDeep({
                        config: instanceConfig
                    }));
                    return obj;
                }

                self.AspectInstance = function (aspectConfig) {

                    var obj = {};
                    LIB._.merge(obj, LIB._.cloneDeep(self.__proto__.config));
                    LIB._.merge(obj, LIB._.cloneDeep(instanceConfig));

                    var json = JSON.stringify(aspectConfig);
                    json = json.replace(new RegExp("\\(EncryptedUsing" + obj.secret + "\\)", "g"), "");
                    aspectConfig = JSON.parse(json);

                    return LIB.Promise.resolve(aspectConfig);
                }
            }
            Entity.prototype._entity = "07-InstanceAspects/profile";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
