const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const compiledFactory = require('./build/EventFactory.json')

const provider = new HDWalletProvider(
  'banner present north antique pioneer bone flip april bronze mechanic praise mail',
  'https://ropsten.infura.io/v3/e8edd435947d4bb9aaf788b2055b70cb'
);
const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log("Attempting to deploy from account", accounts[0]);

  const result = await new web3.eth.Contract(
    JSON.parse(compiledFactory.interface)
  )
      .deploy({ data: compiledFactory.bytecode })
      .send({ gas: '5000000', from: accounts[0] });

  console.log("Contract deployed to", result.options.address);
};
deploy();
