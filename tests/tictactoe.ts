import * as anchor from "@coral-xyz/anchor";
import {AnchorError, Program, Wallet} from "@coral-xyz/anchor";
import { Tictactoe } from "../target/types/tictactoe";
import {expect} from "chai";
import './test_helpers';

const LAMPORTS_PER_SOL = 1000000000;

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

        await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);

        await depositEscrowAndCheck(program, escrowAccount, playerTwo, gameAccount, 1, provider);
    })

    it("player one wins, no escrow", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);
    });

    it("players bets 1 SOL, player 1 wins 1 SOL escrow", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceAfterDeposit = await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        await withdraw(program, escrowAccount, playerOne, playerTwo, gameAccount);

        const playerOneBalanceAfterWin = await getBalance(provider, playerOne.publicKey);
        expect(playerOneBalanceAfterWin).to.approximatelyEqual(playerOneBalanceAfterDeposit + 1, THREE_POINT_PRECISION);
    });

    it("players bets 1 SOL, player 2 bets 1 SOL, wins 2 SOL escrow", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceAfterDeposit = await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);
        const playerTwoBalanceAfterDeposit =  await depositEscrowAndCheck(program, escrowAccount, playerTwo, gameAccount, 1, provider);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        await withdraw(program, escrowAccount, playerOne, playerTwo, gameAccount);

        const playerOneBalanceAfterWin = await getBalance(provider, playerOne.publicKey);
        expect(playerOneBalanceAfterWin).to.approximatelyEqual(playerOneBalanceAfterDeposit + 2, THREE_POINT_PRECISION);
        const playerTwoBalanceAfterWin = await getBalance(provider, playerTwo.publicKey);
        expect(playerTwoBalanceAfterWin).to.approximatelyEqual(playerTwoBalanceAfterDeposit, THREE_POINT_PRECISION);
    });

    it("tie with escrow, both players get 1 SOL", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceAfterDeposit = await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);
        const playerTwoBalanceAfterDeposit =  await depositEscrowAndCheck(program, escrowAccount, playerTwo, gameAccount, 1, provider);

        await tieGame(program, gameAccount, playerOne, playerTwo);

        await withdraw(program, escrowAccount, playerOne, playerTwo, gameAccount);

        const playerOneBalanceAfterWin = await getBalance(provider, playerOne.publicKey);
        expect(playerOneBalanceAfterWin).to.approximatelyEqual(playerOneBalanceAfterDeposit + 0.5, THREE_POINT_PRECISION);
        const playerTwoBalanceAfterWin = await getBalance(provider, playerTwo.publicKey);
        expect(playerTwoBalanceAfterWin).to.approximatelyEqual(playerTwoBalanceAfterDeposit + 0.5, THREE_POINT_PRECISION);
    });

    it("out of bounds row", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        try {
            await play(
                program,
                gameAccount,
                playerTwo,
                { row: 5, column: 1 }, // ERROR: out of bounds row
                2,
                { active: {} },
                [
                    [{ x: {} }, { x: {} }, null],
                    [{ o: {} }, null, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(6003);
        }
    })

    it("player one attempts to play twice in a row", async() => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await play(
            program,
            gameAccount,
            playerOne,
            { row: 0, column: 0 },
            2,
            { active: {} },
            [
                [{ x: {} }, null, null],
                [null, null, null],
                [null, null, null],
            ]
        );
        try {
            await play(
                program,
                gameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(6003);
        }
    })

    it("attempting to close a running game fails", async() => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await play(
            program,
            gameAccount,
            playerOne,
            { row: 0, column: 0 },
            2,
            { active: {} },
            [
                [{ x: {} }, null, null],
                [null, null, null],
                [null, null, null],
            ]
        );
        try {
            await endGame(
                program,
                gameAccount,
                escrowAccount,
                playerOne,
            )
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(6005);
        }
    })

    it("attempting to close a finished game with escrowed funds fails", async() => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);
        await depositEscrowAndCheck(program, escrowAccount, playerTwo, gameAccount, 1, provider);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        try {
            await endGame(
                program,
                gameAccount,
                escrowAccount,
                playerOne,
            )
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(6012);
        }
    })

    it("player one wins, game is closed", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        await endGame(
            program,
            gameAccount,
            escrowAccount,
            playerOne
        )

        try {
            await play(
                program,
                gameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(3012);
        }
    });

    it("player one wins, game is closed, can start new game", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        await endGame(
            program,
            gameAccount,
            escrowAccount,
            playerOne
        )

        try {
            await play(
                program,
                gameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(3012);
        }

        const [secondGameAccount, secondEscrowAccount] = await createNewGameSamePlayers(program, provider, playerOne, playerTwo);
        await setupGame(program, secondGameAccount, secondEscrowAccount, playerOne, playerTwo);

        await playerOneWinningGame(program, secondGameAccount, playerOne, playerTwo);

        await endGame(
            program,
            secondGameAccount,
            secondEscrowAccount,
            playerOne
        )

        try {
            await play(
                program,
                secondGameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(3012);
        }
    });

    it("game closeable after tie, no escrow", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        await tieGame(program, gameAccount, playerOne, playerTwo);

        await endGame(
            program,
            gameAccount,
            escrowAccount,
            playerOne
        )

        try {
            await play(
                program,
                gameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(3012);
        }
    });

    it("player one wins, escrow withdrawn, game is closed", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceAfterDeposit = await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);
        const playerTwoBalanceAfterDeposit =  await depositEscrowAndCheck(program, escrowAccount, playerTwo, gameAccount, 1, provider);

        await playerOneWinningGame(program, gameAccount, playerOne, playerTwo);

        await withdraw(program, escrowAccount, playerOne, playerTwo, gameAccount);

        const playerOneBalanceAfterWin = await getBalance(provider, playerOne.publicKey);
        expect(playerOneBalanceAfterWin).to.approximatelyEqual(playerOneBalanceAfterDeposit + 2, THREE_POINT_PRECISION);
        const playerTwoBalanceAfterWin = await getBalance(provider, playerTwo.publicKey);
        expect(playerTwoBalanceAfterWin).to.approximatelyEqual(playerTwoBalanceAfterDeposit, THREE_POINT_PRECISION);

        await endGame(
            program,
            gameAccount,
            escrowAccount,
            playerOne
        )

        try {
            await play(
                program,
                gameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(3012);
        }
    });


    it("tie, escrow withdrawn, game closeable", async () => {
        const [gameAccount, escrowAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, escrowAccount, playerOne, playerTwo);

        const playerOneBalanceAfterDeposit = await depositEscrowAndCheck(program, escrowAccount, playerOne, gameAccount, 1, provider);
        const playerTwoBalanceAfterDeposit =  await depositEscrowAndCheck(program, escrowAccount, playerTwo, gameAccount, 1, provider);

        await tieGame(program, gameAccount, playerOne, playerTwo);

        await withdraw(program, escrowAccount, playerOne, playerTwo, gameAccount);

        const playerOneBalanceAfterWin = await getBalance(provider, playerOne.publicKey);
        expect(playerOneBalanceAfterWin).to.approximatelyEqual(playerOneBalanceAfterDeposit + 0.5, THREE_POINT_PRECISION);
        const playerTwoBalanceAfterWin = await getBalance(provider, playerTwo.publicKey);
        expect(playerTwoBalanceAfterWin).to.approximatelyEqual(playerTwoBalanceAfterDeposit + 0.5, THREE_POINT_PRECISION);

        await endGame(
            program,
            gameAccount,
            escrowAccount,
            playerOne
        )

        try {
            await play(
                program,
                gameAccount,
                playerOne,
                {row: 1, column: 1},
                3,
                { active: {} },
                [
                    [{ x: {} }, null, null],
                    [null, { x: {} }, null],
                    [null, null, null],
                ]
            );
            // we use this to make sure we definitely throw an error
            chai.assert(false, "should've failed but didn't ");
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;
            expect(err.error.errorCode.number).to.equal(3012);
        }
    });
});

async function depositEscrowAndCheck(
    program: anchor.Program<Tictactoe>,
    escrowAccount: anchor.web3.PublicKey,
    player: { publicKey: any; },
    gameAccount: anchor.web3.PublicKey,
    sol_amount: number,
    provider: any
) {
    const playerBalanceBeforeDeposit = await getBalance(provider, player.publicKey);
    await deposit(program, escrowAccount, player, gameAccount, sol_amount * LAMPORTS_PER_SOL)
    const playerBalanceAfterDeposit = await getBalance(provider, player.publicKey);

    expect(playerBalanceAfterDeposit).to.approximatelyEqual(playerBalanceBeforeDeposit - (sol_amount));

    return playerBalanceAfterDeposit;
}

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

const createGameAccounts = async (
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

const createNewGameSamePlayers = async (
    program: Program<Tictactoe>,
    provider: anchor.AnchorProvider,
    playerOne: any,
    playerTwo: anchor.web3.Keypair,
) => {
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
    return [gameAccount, escrowAccount];
}

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
    escrowAccount: anchor.web3.PublicKey,
    player: any,
) => {
    await program.methods
        .endGame()
        .accounts({
            game: gameAccount,
            escrow: escrowAccount,
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

async function tieGame(
    program: Program<Tictactoe>,
    gameAccount: anchor.web3.PublicKey,
    playerOne: any,
    playerTwo: any,
) {
    await play(
        program,
        gameAccount,
        playerOne,
        { row: 1, column: 1 },
        2,
        { active: {} },
        [
            [null , null, null],
            [null, { x: {} }, null],
            [null, null, null],
        ]
    );

    await play(
        program,
        gameAccount,
        playerTwo,
        {row: 0, column: 0},
        3,
        { active: {} },
        [
            [{ o: {} }, null, null],
            [null, { x: {} }, null],
            [null, null, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerOne,
        {row: 0, column: 1},
        4,
        { active: {} },
        [
            [{ o: {} }, { x: {} }, null],
            [null, { x: {} }, null],
            [null, null, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerTwo,
        {row: 0, column: 2},
        5,
        { active: {} },
        [
            [{ o: {} }, { x: {} }, { o: {} }],
            [null, { x: {} }, null],
            [null, null, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerOne,
        {row: 1, column: 0},
        6,
        { active: {} },
        [
            [{ o: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { x: {} }, null],
            [null, null, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerTwo,
        {row: 1, column: 2},
        7,
        { active: {} },
        [
            [{ o: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { x: {} }, { o: {} }],
            [null, null, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerOne,
        {row: 2, column: 0},
        8,
        { active: {} },
        [
            [{ o: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, null, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerTwo,
        {row: 2, column: 1},
        9,
        { active: {} },
        [
            [{ o: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { o: {} }, null],
        ]
    )

    await play(
        program,
        gameAccount,
        playerOne,
        {row: 2, column: 2},
        10,
        { tie: {} },
        [
            [{ o: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { x: {} }, { o: {} }],
            [{ x: {} }, { o: {} }, { x: {} }],
        ]
    )
}

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
