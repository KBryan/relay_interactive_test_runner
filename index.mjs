import { loadStdlib } from '@reach-sh/stdlib'
import * as backend from './build/index.main.mjs'
import { ask, yesno, done } from '@reach-sh/stdlib/ask.mjs';


(async() => {
    const stdlib = await loadStdlib()
    const isPlayer1 = await ask(
        `Are you Alice?`,
        yesno
    );
    const who = isPlayer1 ? 'Alice' : 'Relay';
    console.log(`Starting example game as ${who}`);

    let acc = null;
    const createAcc = await ask(
        `Would you like to create an account? (only possible on devnet)`,
        yesno
    );

    if (createAcc) {
        acc = await stdlib.newTestAccount(stdlib.parseCurrency(1000));
    } else {
        const secret = await ask(
            `What is your account secret?`,
            (x => x)
        );
        acc = await stdlib.newAccountFromSecret(secret);
    }

    let ctc = null;
    const deployCtc = await ask(
        `Do you want to deploy the contract? (y/n)`,
        yesno
    );
    if (deployCtc) {
        ctc = acc.deploy(backend);
        const info = await ctc.getInfo();
        console.log(`The contract is deployed as = ${JSON.stringify(info)}`);
    } else {
        const info = await ask(
            `Please paste the contract information:`,
            JSON.parse
        );
        ctc = acc.attach(backend, info);
    }

    const fmt = (x) => stdlib.formatCurrency(x, 4);
    const getBalance = async() => fmt(await stdlib.balanceOf(acc));

    const before = await getBalance();
    console.log(`${who} balance is: ${before}`);

    const interact = {...stdlib.hasRandom };

    let accRelayProvide = null;
    const accRelayP = new Promise((resolve, reject) => {
        accRelayProvide = resolve;
    });
    if (acc !== null) {
        if (`${who}` == "Alice") {
            console.log(`Alice stuff  ${who}`);
            await Promise.all([
                backend.Alice(ctc, {
                    amt: stdlib.parseCurrency(25),
                    getRelay: async() => {
                        console.log(`Alice creates a Relay account.`);
                        const accRelay = await stdlib.newTestAccount(stdlib.minimumBalance);
                        console.log(`Alice shares it with Bob outside of the network. ${JSON.stringify(acc.networkAccount)}`);
                        accRelayProvide(accRelay);
                        return acc.networkAccount;
                    },
                }),
            ]);
        } else {

            (async() => {
                console.log(`Bob waits for Alice to give him the information about the Relay account.`);
                const accRelay = await accRelayP;
                console.log(`Bob deposits some funds into the Relay to use it.`);
                await stdlib.transfer(acc, accRelay, stdlib.parseCurrency(1));
                console.log(`Bob attaches to the contract as the Relay.`);
                const ctcRelay = accRelay.attach(backend, ctc.getInfo());
                console.log(`Bob joins the application as the Relay.`);
                return backend.Relay(ctcRelay, {
                    getBob: async() => {
                        console.log(`Bob, acting as the Relay, gives his information.`);
                        return accBob.networkAccount;
                    },
                });
            })
        };
    }

     const after = await getBalance();
    console.log(`${who} balance is: ${after}`);

})();
