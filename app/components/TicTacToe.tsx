import {FC, useEffect, useState} from "react"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import * as anchor from "@project-serum/anchor"
import { Button, Grid, GridItem, Text } from "@chakra-ui/react"
import idl from "../../target/idl/tictactoe.json"

const PROGRAM_ID = new anchor.web3.PublicKey("39YeZsrCamsEh4rjrqGZ74iqEdUwSJAWZhdtkQdP6Tae")

export const TicTacToe: FC = () => {
    const [game, setGame] = useState<anchor.web3.PublicKey | null>(null)
    const [gameState, setGameState] = useState<any>(null)
    const [transactionUrl, setTransactionUrl] = useState("")
    const [program, setProgram] = useState<anchor.Program | null>(null)

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
            const gameKeypair = anchor.web3.Keypair.generate()
            const playerTwo = anchor.web3.Keypair.generate()

            await program.methods
                .setupGame(playerTwo.publicKey)
                .accounts({
                    game: gameKeypair.publicKey,
                    playerOne: wallet.publicKey,
                })
                .signers([gameKeypair])
                .rpc()

            setGame(gameKeypair.publicKey)
            setGameState(await program.account.game.fetch(gameKeypair.publicKey))
        }
    }

    const play = async (tile: { row: number; column: number }) => {
        if (program && wallet && game) {
            const sig = await program.methods
                .play(tile)
                .accounts({
                    player: wallet.publicKey,
                    game,
                })
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
        </div>
    ) : (
        <Button onClick={setupGame} mt={4}>
        Start Game
    </Button>
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