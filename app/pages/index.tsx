import { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { AppBar } from "../components/AppBar";
import { useWallet } from "@solana/wallet-adapter-react";
import { Increment } from "../components/Increment";
import { Initialize } from "../components/Initialize";
import { useState } from "react";
import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import Head from "next/head";
import { Pong } from "../components/pong";
import {
  Spacer,
  VStack,
  Text,
  Button,
  Box,
  Stack,
  Link,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { TicTacToe } from "../components/TicTacToe";

const Home: NextPage = (props) => {
  const [counter, setCounter] = useState("");
  const [transactionUrl, setTransactionUrl] = useState("");
  const wallet = useWallet();

  return (
    <div className={styles.App}>
      <Head>
        <title>Player Dungeon</title>
      </Head>
      <Box h="calc(100vh)" w="full">
        <Stack w="full" h="calc(100vh)" justify="center">
          <AppBar />
          {/* Tabbed View Navigation */}
          <Tabs size='md' variant='soft-rounded' colorScheme="whiteAlpha">
          <TabList>
            <Tab>Ping Pong</Tab>
            <Tab>Tic-Tac-Toe</Tab>
            <Tab>Counter</Tab>
          </TabList>

          {/* We can define game components at each tab panel for desired page view */}
          <TabPanels>
            <TabPanel>
              <Pong />
            </TabPanel>
            <TabPanel>
              <TicTacToe />
            </TabPanel>
            <TabPanel>
              <Text color="white">We gotta get a counter up in here somewhere </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
          <div className={styles.AppBody}>
            {wallet.connected ? (
              <VStack>
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
  );
};

export default Home;
