import {FC, useEffect, useState} from "react"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import * as anchor from "@project-serum/anchor"
import { Button, Grid, GridItem, Input, Text } from "@chakra-ui/react"
import idl from "../../target/idl/tictactoe.json"

const PROGRAM_ID = new anchor.web3.PublicKey("39YeZsrCamsEh4rjrqGZ74iqEdUwSJAWZhdtkQdP6Tae")

export const TicTacToe: FC = () => {
    const [game, setGame] = useState<anchor.web3.PublicKey | null>(null)
    const [gameState, setGameState] = useState<any>(null)
    const [transactionUrl, setTransactionUrl] = useState("")
    const [program, setProgram] = useState<anchor.Program | null>(null)
    const [playerTwo, setPlayerTwo] = useState("")

    const { connection } = useConnection()
    const wallet = useAnchorWallet()

    useEffect(() => {
        const setupProgram = async () => {
            if (wallet) {
                const provider = new anchor.AnchorProvider(connection, wallet, {})
                const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider)
                setProgram(program)
            }
        }

        setupProgram()
    }, [wallet, connection])

    const setupGame = async () => {
        if (program && wallet) {

            const playerTwoKey = new anchor.web3.PublicKey(playerTwo);
            console.log("Player One: ", wallet.publicKey.toString());
            console.log("Player Two: ", playerTwoKey.toString());
            const [gameAccount] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("tictactoe"), wallet.publicKey.toBuffer(), playerTwoKey.toBuffer()],
                program.programId
            );

            console.log("Game account key:", gameAccount.toString());


            try {
                try {
                    const gameData = await program.account.ticTacToeGame.fetch(gameAccount);
                    console.log("Fetched existing game data. You're Player 1: ", gameData);
                    setGame(gameAccount);
                    setGameState(gameData);
                    return;
                } catch {
                    console.log("Couldn't fetch game data. Trying other side...")
                    const playerOneKey = new anchor.web3.PublicKey(playerTwo);
                    console.log("Player One: ", playerOneKey.toString());
                    console.log("Player Two: ", wallet.publicKey.toString());
                    const [gameAccount] = anchor.web3.PublicKey.findProgramAddressSync(
                        [Buffer.from("tictactoe"), playerOneKey.toBuffer(), wallet.publicKey.toBuffer()],
                        program.programId
                    );
                    const gameData = await program.account.ticTacToeGame.fetch(gameAccount);
                    console.log("Fetched existing game data. You're Player 2: ", gameData);
                    setGame(gameAccount);
                    setGameState(gameData);
                    return;
                }
            } catch {
                console.log("No game found between the two players. Creating new game!")
            }

            const tx = program.transaction.setupGame(
                {
                    accounts: {
                        game: gameAccount,
                        playerOne: wallet.publicKey,
                        playerTwo: playerTwoKey,
                        systemProgram: anchor.web3.SystemProgram.programId
                    },
                    signers: [],
                }
            )
            tx.feePayer = wallet.publicKey
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
            const signedTx = await wallet.signTransaction(tx)
            const txId = await connection.sendRawTransaction(signedTx.serialize())
            await connection.confirmTransaction(txId)

            console.log("Game account initialized:", gameAccount)

            setGame(gameAccount)
            const gameData = await program.account.ticTacToeGame.fetch(gameAccount);
            setGameState(gameData)
            console.log("Successfully set up a new game!")
        }
    }

    const resumeGame = async () => {
        if (program && wallet && game) {
            setGameState(await program.account.game.fetch(game))
        }
    }

    const play = async (tile: { row: number; column: number }) => {
        if (program && wallet && game) {
            console.log("Wallet key:", wallet.publicKey)

            const tx = program.transaction.play(
                tile,
                {
                    accounts: {
                        player: wallet.publicKey,
                        game,
                    },
                }
            );

            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTx = await wallet.signTransaction(tx);
            const txId = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction(txId);

            setTransactionUrl(`https://explorer.solana.com/tx/${txId}?cluster=devnet`)
            setGameState(await program.account.ticTacToeGame.fetch(game))
        }
    }

    return (
        <div>
            <Text fontSize="xl" fontWeight="bold">
                Tic Tac Toe
            </Text>
            {game ? (
                <div>
                    {gameState && gameState.board ? (
                        <>
                            <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={4}>
                                {gameState.board.map((row, rowIndex) =>
                                    row.map((cell, colIndex) => (
                                        <GridItem
                                            key={`${rowIndex}-${colIndex}`}
                                            bg="gray.100"
                                            h="100px"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            onClick={() => play({ row: rowIndex, column: colIndex })}
                                            cursor="pointer"
                                        >
                                            {cell === null ? "" : cell.x ? "X" : "O"}
                                        </GridItem>
                                    ))
                                )}
                            </Grid>
                            <Text mt={4}>
                                {gameState.state.active
                                    ? `Player ${((gameState.turn - 1) % 2) + 1}'s turn`
                                    : gameState.state.tie
                                        ? "It's a tie!"
                                        : `Player ${gameState.state.won.winner.toString()} wins!`}
                            </Text>
                        </>
                    ) : (
                        <Text>Loading game state...</Text>
                    )}
                    <Button onClick={resumeGame} mt={4}>
                        Resume Game
                    </Button>
                </div>
            ) : (
                <div>
                    <Input
                        placeholder="Enter player two's address"
                        value={playerTwo}
                        onChange={(e) => setPlayerTwo(e.target.value)}
                        mt={4}
                        color='white'
                    />
                    <Button onClick={setupGame} mt={4}>
                        Start Game
                    </Button>
                </div>
            )}
            {transactionUrl && (
                <Text mt={4}>
                    Transaction:{" "}
                    <a href={transactionUrl} target="_blank" rel="noopener noreferrer">
                        {transactionUrl}
                    </a>
                </Text>
            )}
        </div>
    )
}