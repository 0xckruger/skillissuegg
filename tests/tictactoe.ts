import * as anchor from "@coral-xyz/anchor";
import {AnchorError, Program, Wallet} from "@coral-xyz/anchor";
import { Tictactoe } from "../target/types/tictactoe";
import {expect} from "chai";
import './test_helpers';

const LAMPORTS_PER_SOL = 1000000000;

const airDropSol = async (provider, player1) => {
    try {
        const airdropSignature = await provider.connection.requestAirdrop(
            player1.publicKey,
            2 * LAMPORTS_PER_SOL
        );

        const latestBlockHash = await provider.connection.getLatestBlockhash();

        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSignature,
        });
    } catch (error) {
        console.error(error);
    }
};

async function getBalance(provider, publicKey) {
    try {
        // Fetch the balance
        const balance = await provider.connection.getBalance(publicKey);
        // Convert the balance from lamports to SOL
        const balanceInSol = balance / anchor.web3.LAMPORTS_PER_SOL;
        //console.log(`Balance: ${balanceInSol} SOL`);
        return balanceInSol;
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

async function play(
    program: Program<Tictactoe>,
    game: anchor.Address,
    player: any,
    tile: { row: number; column: number; },
    expectedTurn: any,
    expectedGameState: any,
    expectedBoard: any
) {

    await program.methods
        .play(tile)
        .accounts({
            player: player.publicKey,
            game,
        })
        .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
        .rpc();

    const gameState = await program.account.ticTacToeGame.fetch(game);
    expect(gameState.turn).to.equal(expectedTurn);
    if (gameState.state.won != null) {
        expect(gameState.state.won.winner.toString()).to.eql(expectedGameState.won.winnerPk.toString())
    } else {
        expect(gameState.state).to.eql(expectedGameState);
    }
    expect(gameState.board).to.eql(expectedBoard);
}

const createGameAccounts= async (
    program: Program<Tictactoe>,
    provider: anchor.AnchorProvider
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey, Wallet, anchor.web3.Keypair]> => {
    const playerOne = (program.provider as anchor.AnchorProvider).wallet;
    const playerTwo = anchor.web3.Keypair.generate();
    await airDropSol(provider, playerOne);
    await airDropSol(provider, playerTwo);
    const [gameAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("tictactoe"), playerOne.publicKey.toBuffer(), playerTwo.publicKey.toBuffer()],
        program.programId
    );
    const [escrowAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), gameAccount.toBuffer()],
        program.programId
    );
    return [gameAccount, escrowAccount, playerOne as Wallet, playerTwo];
};

const setupGame = async (
    program: Program<Tictactoe>,
    gameAccount: anchor.web3.PublicKey,
    escrowAccount: anchor.web3.PublicKey,
    playerOne: any,
    playerTwo: anchor.web3.Keypair
) => {

    await program.methods
        .setupGame()
        .accounts({
            game: gameAccount,
            escrow: escrowAccount,
            playerOne: playerOne.publicKey,
            playerTwo: playerTwo.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([playerOne.payer])
        .rpc();

    let gameState = await program.account.ticTacToeGame.fetch(gameAccount);
    expect(gameState.turn).to.equal(1);
    expect(gameState.players).to.eql([playerOne.publicKey, playerTwo.publicKey]);
    expect(gameState.state).to.eql({ active: {} });
    expect(gameState.board).to.eql([
        [null, null, null],
        [null, null, null],
        [null, null, null],
    ]);

    let escrowState = await program.account.escrowAccount.fetch(escrowAccount);
    expect(escrowState.playerOne).to.eql(playerOne.publicKey);
    expect(escrowState.playerTwo).to.eql(playerTwo.publicKey);
    expect(escrowState.amount1.eq(new anchor.BN(0))).to.be.true;
    expect(escrowState.amount2.eq(new anchor.BN(0))).to.be.true;
    expect(escrowState.initialized).to.be.true;
};

const endGame = async(
    program: Program<Tictactoe>,
    gameAccount: anchor.web3.PublicKey,
    player: any,
) => {
    await program.methods
        .endGame()
        .accounts({
            game: gameAccount,
            closer: player.publicKey,
        })
        .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
        .rpc();
};

const deposit = async (
    program: Program<Tictactoe>,
    escrowAccount: anchor.web3.PublicKey,
    player: any,
    gameAccount: anchor.web3.PublicKey,
    lamports: number,
) => {
    await program.methods
        .deposit(new anchor.BN(lamports))
        .accounts({
            game: gameAccount,
            user: player.publicKey,
            escrow: escrowAccount,
        })
        .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
        .rpc();
};

const withdraw = async (
    program: Program<Tictactoe>,
    escrowAccount: anchor.web3.PublicKey,
    playerOne: any,
    playerTwo: any,
    gameAccount: anchor.web3.PublicKey,
) => {
    await program.methods
        .withdraw()
        .accounts({
            playerOne: playerOne.publicKey,
            playerTwo: playerTwo.publicKey,
            game: gameAccount,
            escrow: escrowAccount,
        })
        .rpc();
}

describe("tictactoe", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Tictactoe as Program<Tictactoe>;

    const FIVE_POINT_PRECISION = 5;
    const THREE_POINT_PRECISION = 3;

    it("setup game!", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);
    });

    it!("setup game and player one deposit", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceBeforeDeposit = await getBalance(provider, playerOne.publicKey);
        await deposit(program, escrowAccount, playerOne, gameAccount, LAMPORTS_PER_SOL)
        const playerOneBalanceAfterDeposit = await getBalance(provider, playerOne.publicKey);

        expect(playerOneBalanceAfterDeposit).to.approximatelyEqual(playerOneBalanceBeforeDeposit - 1);
    })

    it!("setup game and player two deposit", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerTwoBalanceBeforeDeposit = await getBalance(provider, playerTwo.publicKey);
        await deposit(program, escrowAccount, playerTwo, gameAccount, LAMPORTS_PER_SOL)
        const playerTwoBalanceAfterDeposit = await getBalance(provider, playerTwo.publicKey);

        expect(playerTwoBalanceAfterDeposit).to.approximatelyEqual(playerTwoBalanceBeforeDeposit - 1);

    })

    it!("setup game and both players deposit", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceBeforeDeposit = await getBalance(provider, playerOne.publicKey);
        await deposit(program, escrowAccount, playerOne, gameAccount, LAMPORTS_PER_SOL)
        const playerOneBalanceAfterDeposit = await getBalance(provider, playerOne.publicKey);

        expect(playerOneBalanceAfterDeposit).to.approximatelyEqual(playerOneBalanceBeforeDeposit - 1);

        const playerTwoBalanceBeforeDeposit = await getBalance(provider, playerTwo.publicKey);
        await deposit(program, escrowAccount, playerTwo, gameAccount, LAMPORTS_PER_SOL)
        const playerTwoBalanceAfterDeposit = await getBalance(provider, playerTwo.publicKey);

        expect(playerTwoBalanceAfterDeposit).to.approximatelyEqual(playerTwoBalanceBeforeDeposit - 1);
    })

    it("player one wins, no escrow", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);
    });

    it("players bets 1 SOL, player 1 wins escrow", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceBeforeDeposit = await getBalance(provider, playerOne.publicKey);
        await deposit(program, escrowAccount, playerOne, gameAccount, LAMPORTS_PER_SOL)
        const playerOneBalanceAfterDeposit = await getBalance(provider, playerOne.publicKey);

        expect(playerOneBalanceAfterDeposit).to.approximatelyEqual(playerOneBalanceBeforeDeposit - 1);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        await withdraw(program, escrowAccount, playerOne, playerTwo, gameAccount);

        const playerOneBalanceAfterWin = await getBalance(provider, playerOne.publicKey);
        expect(playerOneBalanceAfterWin).to.approximatelyEqual(playerOneBalanceAfterDeposit + 1, THREE_POINT_PRECISION);

    });
});

async function playerOneWinningGame(
    program: Program<Tictactoe>,
    gameAccount: anchor.web3.PublicKey,
    playerOne: any,
    playerTwo: any,
) {
    const winnerPk = playerOne.publicKey;

    const plays = [
        {
            player: playerOne,
            tile: { row: 0, column: 0 },
            expectedTurn: 2,
            expectedState: { active: {} },
            expectedBoard: [
                [{ x: {} }, null, null],
                [null, null, null],
                [null, null, null],
            ]
        },
        {
            player: playerTwo,
            tile: { row: 1, column: 1 },
            expectedTurn: 3,
            expectedState: { active: {} },
            expectedBoard: [
                [{ x: {} }, null, null],
                [null, { o: {} }, null],
                [null, null, null],
            ]
        },
        {
            player: playerOne,
            tile: { row: 1, column: 0 },
            expectedTurn: 4,
            expectedState: { active: {} },
            expectedBoard: [
                [{ x: {} }, null, null],
                [{ x: {} }, { o: {} }, null],
                [null, null, null],
            ]
        },
        {
            player: playerTwo,
            tile: { row: 2, column: 1 },
            expectedTurn: 5,
            expectedState: { active: {} },
            expectedBoard: [
                [{ x: {} }, null, null],
                [{ x: {} }, { o: {} }, null],
                [null, { o: {} }, null],
            ]
        },
        {
            player: playerOne,
            tile: { row: 2, column: 0 },
            expectedTurn: 6,
            expectedState: { won: { winnerPk } },
            expectedBoard: [
                [{ x: {} }, null, null],
                [{ x: {} }, { o: {} }, null],
                [{ x: {} }, { o: {} }, null],
            ]
        }
    ];

    for (const playInfo of plays) {
        await play(
            program,
            gameAccount,
            playInfo.player,
            playInfo.tile,
            playInfo.expectedTurn,
            playInfo.expectedState,
            playInfo.expectedBoard
        );
    }
}
