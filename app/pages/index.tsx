import { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { AppBar } from "../components/AppBar";
import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import Head from "next/head";
import { Pong } from "../components/pong";
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
      <Box h="calc(100vh)" w="full">
        <Stack w="full" h="calc(100vh)">
          <AppBar position="fixed" top={0} />
          <Tabs size='md' variant='soft-rounded' colorScheme="whiteAlpha" mt={16}>
          <TabList>
            <Tab>Ping Pong</Tab>
            <Tab>Tic-Tac-Toe</Tab>
          </TabList>

          {/* We can define game components at each tab panel for desired page view */}
          <TabPanels>
            <TabPanel>
              <Pong />
            </TabPanel>
            <TabPanel>
              <TicTacToe />
            </TabPanel>
          </TabPanels>
          </Tabs>
        </Stack>
      </Box>
    </div>
  );
};

export default Home;
