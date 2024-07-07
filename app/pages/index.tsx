import { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { AppBar } from "../components/AppBar";
import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import Head from "next/head";
import PongGame from '../components/pong'
import {
  Box,
  Stack,
} from "@chakra-ui/react";
import { TicTacToe } from "../components/TicTacToe";

const Home: NextPage = (props) => {

  return (
    <div className={styles.App}>
      <Head>
        <title>SkillIssueGG</title>
      </Head>
      <Box>
        <Box position="fixed" top={0} left={0} right={0} zIndex={1000}>
          <AppBar />
        </Box>
        <Box paddingTop="32px"> {/* Adjust this value to match your AppBar height */}
          <Stack w="full" minHeight="calc(100vh - 64px)"> {/* Adjust 64px to match your AppBar height */}
          <Tabs size='md' variant='soft-rounded' colorScheme="whiteAlpha" mt={16}>
          <TabList>
            <Tab>Pong</Tab>
            <Tab>Tic-Tac-Toe</Tab>
          </TabList>

          {/* We can define game components at each tab panel for desired page view */}
          <TabPanels>
            <TabPanel>
              <PongGame />
            </TabPanel>
            <TabPanel>
              <TicTacToe />
            </TabPanel>
          </TabPanels>
          </Tabs>
        </Stack>
      </Box>
      </Box>
    </div>
  );
};

export default Home;
