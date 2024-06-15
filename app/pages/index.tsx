import { NextPage } from "next"
import styles from "../styles/Home.module.css"
import { AppBar } from "../components/AppBar"
import { useWallet } from "@solana/wallet-adapter-react"
import { Increment } from "../components/Increment"
import { Initialize } from "../components/Initialize"
import { useState } from "react"
import Head from "next/head"
import { Pong } from "../components/pong"
import {
  Spacer,
  VStack,
  Text,
  Button,
  Box,
  Stack,
  Link,
} from "@chakra-ui/react"
import NextLink from "next/link";
import { TicTacToe } from "../components/TicTacToe"

const Home: NextPage = (props) => {
  const [counter, setCounter] = useState("")
  const [transactionUrl, setTransactionUrl] = useState("")
  const wallet = useWallet()

  return (
      <div className={styles.App}>
        <Head>
          <title>Anchor Frontend Example</title>
        </Head>
        <Box h="calc(100vh)" w="full">
          <Stack w="full" h="calc(100vh)" justify="center">
            <AppBar />
            <div className={styles.AppBody}>
              {wallet.connected ? (
                  <VStack>
                    <Pong />
                    {counter ? (
                        <Increment
                            counter={counter}
                            setTransactionUrl={setTransactionUrl}
                        />
                    ) : (
                        <Initialize
                            setCounter={setCounter}
                            setTransactionUrl={setTransactionUrl}
                        />
                    )}
            
                    <TicTacToe />
                  </VStack>
              ) : (
                  <Text color="white">Connect Wallet</Text>
              )}
              <Spacer />
              {transactionUrl && (
                  <Link href={transactionUrl} color="white" isExternal margin={8}>
                    View most recent transaction
                  </Link>
              )}
            </div>
          </Stack>
        </Box>
      </div>
  )
}

export default Home