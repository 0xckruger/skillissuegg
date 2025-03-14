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
        <Box paddingTop="32px">
          <Stack w="full" minHeight="calc(100vh - 32px)">
          <Tabs size='md' variant='soft-rounded' colorScheme="whiteAlpha" mt={16}>
          <TabList>
            <Tab>Pong</Tab>
            <Tab>Tic-Tac-Toe</Tab>
            <Tab>Dodge The Creeps</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <PongGame />
            </TabPanel>
            <TabPanel>
              <TicTacToe />
            </TabPanel>
            <TabPanel>
              <iframe 
                src="/dodge-the-creeps/dodge-the-creeps.html" 
                width="100%" 
                height="600px" 
                style={{ border: 'none' }}
              />
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
