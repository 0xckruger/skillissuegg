import {FC, useEffect, useState} from "react"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import * as anchor from "@project-serum/anchor"
import { Button, Grid, GridItem, Input, Text, VStack, HStack, Box } from "@chakra-ui/react"
import idl from "../../target/idl/tictactoe.json"
import { getErrorMessage } from '../errors'

const PROGRAM_ID = new anchor.web3.PublicKey("39YeZsrCamsEh4rjrqGZ74iqEdUwSJAWZhdtkQdP6Tae")

export const TicTacToe: FC = () => {
    const [game, setGame] = useState<anchor.web3.PublicKey | null>(null)
    const [escrow, setEscrow] = useState<anchor.web3.PublicKey | null>(null)
    const [gameState, setGameState] = useState<any>(null)
    const [escrowState, setEscrowState] = useState<any>(null)
    const [transactionUrl, setTransactionUrl] = useState("")
    const [program, setProgram] = useState<anchor.Program | null>(null)
    const [playerTwo, setPlayerTwo] = useState("")
    const [betAmount, setBetAmount] = useState("")

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

    useEffect(() => {
        const fetchEscrowState = async () => {
            if (program && escrow) {
                try {
                    const escrowData = await program.account.escrowAccount.fetch(escrow);
                    setEscrowState(escrowData);
                } catch (error) {
                    console.error("Error fetching escrow state:", error);
                }
            }
        };

        fetchEscrowState();
    }, [program, escrow, gameState]);

    const handleError = (error: any) => {
        console.error("Error:", error);
        if (error.error && error.error.errorCode) {
            const errorCode = error.error.errorCode.number;
            const errorMessage = getErrorMessage(errorCode);
            alert(`Error: ${errorMessage}`);
        } else {
            alert("An unexpected error occurred. Please try again.");
        }
    };

    const setupGame = async () => {
        if (program && wallet) {
            const playerTwoKey = new anchor.web3.PublicKey(playerTwo);
            const [gameAccount] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("tictactoe"), wallet.publicKey.toBuffer(), playerTwoKey.toBuffer()],
                program.programId
            );
            const [escrowAccount] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("escrow"), gameAccount.toBuffer()],
                program.programId
            );

            try {
                const gameData = await program.account.ticTacToeGame.fetch(gameAccount);
                console.log("Fetched existing game data:", gameData);
                setGame(gameAccount);
                setEscrow(escrowAccount);
                setGameState(gameData);
                return;
            } catch {
                console.log("No game found. Creating new game!");
            }

            const tx = program.transaction.setupGame(
                {
                    accounts: {
                        game: gameAccount,
                        escrow: escrowAccount,
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

            setGame(gameAccount)
            setEscrow(escrowAccount)
            const gameData = await program.account.ticTacToeGame.fetch(gameAccount);
            setGameState(gameData)
            console.log("Successfully set up a new game!")
        }
    }

    const placeBet = async () => {
        if (program && wallet && game && escrow) {
            const amount = new anchor.BN(parseFloat(betAmount) * anchor.web3.LAMPORTS_PER_SOL);
            try {
                const tx = await program.methods.deposit(amount)
                    .accounts({
                        game: game,
                        user: wallet.publicKey,
                        escrow: escrow,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .transaction();

                tx.feePayer = wallet.publicKey;
                tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                const signedTx = await wallet.signTransaction(tx);
                const txId = await connection.sendRawTransaction(signedTx.serialize());
                await connection.confirmTransaction(txId);

                console.log("Bet placed successfully!");
                setBetAmount(""); // Clear bet amount input
                // Fetch updated escrow state
                const updatedEscrowState = await program.account.escrowAccount.fetch(escrow);
                setEscrowState(updatedEscrowState);
            } catch (error) {
                handleError(error);
            }
        }
    }

    const withdrawFunds = async () => {
        if (program && wallet && game && escrow) {
            try {
                const tx = await program.methods.withdraw()
                    .accounts({
                        game: game,
                        escrow: escrow,
                        playerOne: gameState.players[0],
                        playerTwo: gameState.players[1],
                        systemProgram: anchor.web3.SystemProgram.programId,
                    })
                    .transaction();

                tx.feePayer = wallet.publicKey;
                tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                const signedTx = await wallet.signTransaction(tx);
                const txId = await connection.sendRawTransaction(signedTx.serialize());
                await connection.confirmTransaction(txId);

                console.log("Funds withdrawn successfully!");
                // Fetch updated escrow state
                const updatedEscrowState = await program.account.escrowAccount.fetch(escrow);
                setEscrowState(updatedEscrowState);
            } catch (error) {
                handleError(error);
            }
        }
    }

    const endGame = async () => {
        if (program && wallet && game && escrow) {
            try {
                const tx = await program.methods.endGame()
                    .accounts({
                        game: game,
                        escrow: escrow,
                        closer: wallet.publicKey,
                    })
                    .transaction();

                tx.feePayer = wallet.publicKey;
                tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                const signedTx = await wallet.signTransaction(tx);
                const txId = await connection.sendRawTransaction(signedTx.serialize());
                await connection.confirmTransaction(txId);

                console.log("Game ended successfully!");
                setGame(null);
                setEscrow(null);
                setGameState(null);
                setEscrowState(null);
            } catch (error) {
                handleError(error);
            }
        }
    }

    const play = async (tile: { row: number; column: number }) => {
        if (program && wallet && game) {
            try {
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
            } catch (error) {
                handleError(error);
            }
        }
    }

    const getGameOutcome = () => {
        if (!gameState || gameState.state.active) return null;
        if (gameState.state.tie) return "It's a tie!";
        const winner = gameState.state.won.winner.toString();
        return wallet?.publicKey.toString() === winner ? "You won!" : "You lost!";
    }

    return (
        <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="bold" color="white">
                Tic Tac Toe
            </Text>
            {game ? (
                <VStack spacing={4}>
                    {gameState && gameState.board ? (
                        <>
                            <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                {gameState.board.map((row, rowIndex) =>
                                    row.map((cell, colIndex) => (
                                        <GridItem
                                            key={`${rowIndex}-${colIndex}`}
                                            bg="gray.100"
                                            h="100px"
                                            w="100px"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            onClick={() => play({ row: rowIndex, column: colIndex })}
                                            cursor="pointer"
                                        >
                                            <Text fontSize="4xl">{cell === null ? "" : cell.x ? "X" : "O"}</Text>
                                        </GridItem>
                                    ))
                                )}
                            </Grid>
                            <Text color='white'>
                                {gameState.state.active
                                    ? `Player ${((gameState.turn - 1) % 2) + 1}'s turn`
                                    : getGameOutcome()}
                            </Text>
                            {escrowState && (
                                <Box color="white">
                                    <Text>Escrow Amounts:</Text>
                                    <Text>Player 1: {escrowState.amount1.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL</Text>
                                    <Text>Player 2: {escrowState.amount2.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL</Text>
                                </Box>
                            )}
                            {gameState.state.active && gameState.turn === 1 && (
                                <HStack>
                                    <Input
                                        placeholder="Enter bet amount in SOL"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        color='white'
                                    />
                                    <Button onClick={placeBet} colorScheme="green">
                                        Place Bet
                                    </Button>
                                </HStack>
                            )}
                            {!gameState.state.active && (
                                <HStack>
                                    <Button onClick={withdrawFunds} colorScheme="blue">
                                        Withdraw Funds
                                    </Button>
                                    <Button onClick={endGame} colorScheme="red">
                                        End Game
                                    </Button>
                                </HStack>
                            )}
                        </>
                    ) : (
                        <Text color="white">Loading game state...</Text>
                    )}
                </VStack>
            ) : (
                <VStack spacing={4}>
                    <Input
                        placeholder="Enter player two's address"
                        value={playerTwo}
                        onChange={(e) => setPlayerTwo(e.target.value)}
                        color='white'
                    />
                    <Button onClick={setupGame} colorScheme="blue">
                        Start Game
                    </Button>
                </VStack>
            )}
            {transactionUrl && (
                <Text mt={4} color="white">
                    Transaction:{" "}
                    <a href={transactionUrl} target="_blank" rel="noopener noreferrer">
                        {transactionUrl}
                    </a>
                </Text>
            )}
        </VStack>
    )
}