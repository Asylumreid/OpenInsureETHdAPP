const OpenInsureApp = artifacts.require("OpenInsureApp");
const OpenInsureData = artifacts.require("OpenInsureData");
const fs = require('fs');

module.exports = function(deployer) {

    let firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
    deployer.deploy(OpenInsureData)
    .then(() => {
        return deployer.deploy(OpenInsureApp, OpenInsureData.address)
                .then(() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:8545',
                            dataAddress: OpenInsureData.address,
                            appAddress: OpenInsureApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    });
}