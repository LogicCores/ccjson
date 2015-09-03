
exports.forLib = function (LIB) {

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                
console.log("instanceConfig", instanceConfig);

            }
            Entity.prototype._entity = "01-EntityImplementation/entity";
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
