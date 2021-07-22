const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider({ gasLimit: 20000000 }));

const compiledFactory = require("../ethereum/build/EventFactory.json");
const compiledCampaign = require("../ethereum/build/Event.json");

let accounts;
let factory;
let eventAddress;
let event;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({ data: compiledFactory.bytecode })
    .send({ from: accounts[0], gas: "20000000" });

  await factory.methods.createEvent("test event", 1, 1, "Elton John's world tour", "Faketown auditorium", 100).send({
    from: accounts[0],
    gas: "20000000",
  });

  [eventAddress] = await factory.methods.getDeployedEvents().call();
  event = await new web3.eth.Contract(
    JSON.parse(compiledCampaign.interface),
    eventAddress
  );
});


describe("Events", () => {


  it("deploys a factory and an event", () => {
    assert.ok(factory.options.address);
    assert.ok(event.options.address);
  });


  it("marks caller as the event manager", async () => {
    const manager = await event.methods.manager().call();
    assert.equal(accounts[0], manager);
  });


  it("allows the user to buy a ticket and stores their details", async () => {
  await event.methods.buyTicket("Louie").send({
    from: accounts[1],
    value: '1',
    gas: '20000000'
  });
   const isContributor = await event.methods.attendees(accounts[1]).call();
    assert(isContributor.valid);
  });


  it("restricts users from buying more tickets than are available", async() => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    try{
      await event.methods.buyTicket("Joe").send({
        from: accounts[2],
        value: '1',
        gas: '20000000'
      });
    } catch (err) {
      assert(err);
      return;
    }

    assert(false)
  });

  it("restricts users from buying for the wrong price", async() => {
    try {
      await event.methods.buyTicket("Louie").send({
        from: accounts[1],
        value: '2',
        gas: '20000000'
      });
    } catch (err) {
      assert(err);
      return;
    }

    assert(false);

  });

  //Max value in constructor needs changing to 2
  it("stops the same user buying two tickets", async() => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    try {
      await event.methods.buyTicket("Joe").send({
        from: accounts[2],
        value: '1',
        gas: '20000000'
      });
    } catch (err) {
      assert(err);
      return;
    }

    assert(false);
  });

  it("stops users on blacklist from buying tickets", async () => {
    await event.methods.addToBlackList(accounts[1]).send({
      from: accounts[0]
    });

    try {
      await event.methods.buyTicket("Louie").send({
        from: accounts[1],
        value: '1',
        gas: '20000000'
      });
    } catch (err) {
      assert(err);
      return;
    }

    assert(false);
  });

  it("removes users from attendees list when added to the blacklist", async () => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    await event.methods.addToBlackList(accounts[1]).send({
      from: accounts[0]
    });

    const isBanned = await event.methods.attendees(accounts[1]).call();
    assert(!isBanned.valid);
  });

  it("challenge function issues users a confirmation code", async () => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    const confirmationCode = await event.methods.getConfirmationCode(accounts[1]).call();

    await event.methods.challengeAttendee(accounts[1], 8).send({
      from: accounts[0]
    });

    const userCode = await event.methods.getConfirmationCode(accounts[1]).call();



    assert.notEqual(confirmationCode, userCode)
  });

  it("confirming ticket ownership with code confirms the validity of the user", async () => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    await event.methods.challengeAttendee(accounts[1], 8).send({
      from: accounts[0]
    });

    const confirmationCode = await event.methods.getConfirmationCode(accounts[1]).call();

    await event.methods.confirmTicketOwnerShip(confirmationCode).send({
      from: accounts[1]
    });

    const confirmation = await event.methods.confirmResponse(accounts[1]).call();

    assert(confirmation);
  });

  it("entering incorrect code for ticket ownership denies the validity of the user", async () => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    await event.methods.challengeAttendee(accounts[1], 8).send({
      from: accounts[0]
    });

    await event.methods.confirmTicketOwnerShip("0").send({
      from: accounts[1]
    });

    const confirmation = await event.methods.confirmResponse(accounts[1]).call();

    assert(!confirmation);
  });

  it("entering code as a different user does not validate the user", async () => {
    await event.methods.buyTicket("Louie").send({
      from: accounts[1],
      value: '1',
      gas: '20000000'
    });

    await event.methods.challengeAttendee(accounts[1], 8).send({
      from: accounts[0]
    });

    const confirmationCode = await event.methods.getConfirmationCode(accounts[1]).call();

    try{
      await event.methods.confirmTicketOwnerShip(confirmationCode).send({
        from: accounts[2]
      });
    } catch (err) {
      assert(err);
      return;
    }

    assert(false);
  });

  it("event details function returns all the correct details of an event", async () => {
    const details = await event.methods.getEventDetails().call();
    const title = await event.methods.title().call();
    assert.equal(details[0], title);
    const maxAttendees = await event.methods.maxAttendees().call();
    assert.equal(details[1], maxAttendees);
    const ticketsSold = await event.methods.ticketsSold().call();
    assert.equal(details[2], ticketsSold);
    const ticketCost = await event.methods.ticketCost().call();
    assert.equal(details[3], ticketCost);
    const eventDescription = await event.methods.eventDescription().call();
    assert.equal(details[4], eventDescription);
    const eventLocation = await event.methods.eventLocation().call();
    assert.equal(details[5], eventLocation);
    const eventDate = await event.methods.eventDate().call();
    assert.equal(details[6], eventDate);
  });


});
