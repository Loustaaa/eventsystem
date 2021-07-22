import web3 from './web3';
import EventFactory from './build/EventFactory.json';

const factory = new web3.eth.Contract(
  JSON.parse(EventFactory.interface),
  '0x76AaF39F7C5C5282C677b064483719B5f8569059'
);

export default factory;
