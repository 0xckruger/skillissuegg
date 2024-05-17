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

            const player: any = wallet;
            await program.methods
                .setupGame()
                .accounts({
                    game: gameAccount,
                    playerOne: wallet.publicKey,
                    playerTwo: playerTwoKey,
                    systemProgram: anchor.web3.SystemProgram.programId
                })
                .signers([player.payer])
                .rpc();

            console.log("Game is set up!")

            setGame(gameAccount)
            setGameState(await program.account.game.fetch(gameAccount))
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
            const player: any = wallet;
            const sig = await program.methods
                .play(tile)
                .accounts({
                    player: wallet.publicKey,
                    game,
                })
                .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
                .rpc()

            setTransactionUrl(`https://explorer.solana.com/tx/${sig}?cluster=devnet`)
            setGameState(await program.account.game.fetch(game))
        }
    }

    return (
        <div>
            <Text fontSize="xl" fontWeight="bold">
                Tic Tac Toe
            </Text>
            {game ? (
                <div>
                    {gameState ? (
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
                                    ? `Player ${gameState.turn}'s turn`
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