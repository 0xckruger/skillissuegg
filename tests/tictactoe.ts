import * as anchor from "@coral-xyz/anchor";
import {AnchorError, Program, Wallet} from "@coral-xyz/anchor";
import { Tictactoe } from "../target/types/tictactoe";
import {expect} from "chai";

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

  const gameState = await program.account.game.fetch(game);
  expect(gameState.turn).to.equal(expectedTurn);
  if (gameState.state.won != null) {
      expect(gameState.state.won.winner.toString()).to.eql(expectedGameState.won.winnerPk.toString())
  } else {
      expect(gameState.state).to.eql(expectedGameState);
  }
  expect(gameState.board).to.eql(expectedBoard);
}

const createGameAccounts = async (
    program: Program<Tictactoe>
): Promise<[anchor.web3.Keypair, Wallet, anchor.web3.Keypair]> => {
    const gameKeypair = anchor.web3.Keypair.generate();
    const playerOne = (program.provider as anchor.AnchorProvider).wallet;
    const playerTwo = anchor.web3.Keypair.generate();
    return [gameKeypair, playerOne as Wallet, playerTwo];
};

const setupGame = async (
    program: Program<Tictactoe>,
    gameKeypair: anchor.web3.Keypair,
    playerOne: any,
    playerTwo: anchor.web3.Keypair
) => {
    await program.methods
        .setupGame(playerTwo.publicKey)
        .accounts({
            game: gameKeypair.publicKey,
            playerOne: playerOne.publicKey,
        })
        .signers([gameKeypair])
        .rpc();

    let gameState = await program.account.game.fetch(gameKeypair.publicKey);
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
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Tictactoe as Program<Tictactoe>;

    it("setup game!", async () => {
        const [gameKeypair, playerOne, playerTwo] = await createGameAccounts(program);
        await setupGame(program, gameKeypair, playerOne, playerTwo);
    });


    it("player one wins", async () => {
        const [gameKeypair, playerOne, playerTwo] = await createGameAccounts(program);
        await setupGame(program, gameKeypair, playerOne, playerTwo);

        let winnerPk = playerOne.publicKey;

        await play(
            program,
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
        const [gameKeypair, playerOne, playerTwo] = await createGameAccounts(program);
        await setupGame(program, gameKeypair, playerOne, playerTwo);

        await play(
            program,
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
            gameKeypair.publicKey,
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
      const [gameKeypair, playerOne, playerTwo] = await createGameAccounts(program);
      await setupGame(program, gameKeypair, playerOne, playerTwo);

      try {
          await play(
              program,
              gameKeypair.publicKey,
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
      const [gameKeypair, playerOne, playerTwo] = await createGameAccounts(program);
      await setupGame(program, gameKeypair, playerOne, playerTwo);

      await play(
          program,
          gameKeypair.publicKey,
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
              gameKeypair.publicKey,
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
