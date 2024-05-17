import * as anchor from "@coral-xyz/anchor";
import {AnchorError, Program, Wallet} from "@coral-xyz/anchor";
import { Tictactoe } from "../target/types/tictactoe";
import {expect} from "chai";

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
        console.log(`Balance: ${balanceInSol} SOL`);
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
): Promise<[anchor.web3.PublicKey, Wallet, anchor.web3.Keypair]> => {
    const playerOne = (program.provider as anchor.AnchorProvider).wallet;
    const playerTwo = anchor.web3.Keypair.generate();
    await airDropSol(provider, playerOne);
    await airDropSol(provider, playerTwo);
    const [gameAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("tictactoe"), playerOne.publicKey.toBuffer(), playerTwo.publicKey.toBuffer()],
        program.programId
    );
    return [gameAccount, playerOne as Wallet, playerTwo];
};

const setupGame = async (
    program: Program<Tictactoe>,
    gameAccount: anchor.web3.PublicKey,
    playerOne: any,
    playerTwo: anchor.web3.Keypair
) => {

    await program.methods
        .setupGame()
        .accounts({
            game: gameAccount,
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
};


describe("tictactoe", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Tictactoe as Program<Tictactoe>;

    it("setup game!", async () => {
        const [gameAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, playerOne, playerTwo);
    });


    it("player one wins", async () => {
        const [gameAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, playerOne, playerTwo);

        let winnerPk = playerOne.publicKey;

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

        await play(
            program,
            gameAccount,
            playerTwo,
            {row: 1, column: 1},
            3,
            { active: {} },
            [
                [{ x: {} }, null, null],
                [null, { o: {} }, null],
                [null, null, null],
            ]
        )

        await play(
            program,
            gameAccount,
            playerOne,
            {row: 1, column: 0},
            4,
            { active: {} },
            [
                [{ x: {} }, null, null],
                [{ x: {} }, { o: {} }, null],
                [null, null, null],
            ]
        )

        await play(
            program,
            gameAccount,
            playerTwo,
            {row: 2, column: 1},
            5,
            { active: {} },
            [
                [{ x: {} }, null, null],
                [{ x: {} }, { o: {} }, null],
                [null, { o: {} }, null],
            ]
        )

        await play(
            program,
            gameAccount,
            playerOne,
            {row: 2, column: 0},
            6,
            { won: {winnerPk} },
            [
                [{ x: {} }, null, null],
                [{ x: {} }, { o: {} }, null],
                [{ x: {} }, { o: {} }, null],
            ]
        )
    });

    it("tie", async () => {
        const [gameAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, playerOne, playerTwo);

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
    });

    it("out of bounds row", async () => {
        const [gameAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, playerOne, playerTwo);

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
        const [gameAccount, playerOne, playerTwo] =
            await createGameAccounts(program, provider);
        await setupGame(program, gameAccount, playerOne, playerTwo);

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
});
