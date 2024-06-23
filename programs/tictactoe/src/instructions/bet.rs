use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use crate::state::game::{GameState, TicTacToeGame};
use crate::errors::TicTacToeError;

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.turn == 1, TicTacToeError::GameAlreadyStarted);
    let user = &mut ctx.accounts.user;
    require!(user.key() == game.players[0] || user.key() == game.players[1], TicTacToeError::UnauthorizedUser);

    let escrow = &mut ctx.accounts.escrow;

    if escrow.get_player_one().key() == user.key() {
        escrow.amount1 = amount;
    } else if escrow.get_player_two().key() == user.key() {
        escrow.amount2 = amount;
    } else {
        return Err(TicTacToeError::UnauthorizedUser.into());
    }

    let transfer_instruction = transfer(
        user.to_account_info().key,
        escrow.to_account_info().key,
        amount,
    );

    invoke(
        &transfer_instruction,
        &[
            user.to_account_info(),
            escrow.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let game = &ctx.accounts.game;
    let escrow = &mut ctx.accounts.escrow;

    let total_escrow = escrow.amount1 + escrow.amount2;

    match game.state {
        GameState::Tie => {
            let half_amount = total_escrow / 2;
            escrow.to_account_info().sub_lamports(total_escrow)?;
            ctx.accounts.player_one.add_lamports(half_amount)?;
            ctx.accounts.player_two.add_lamports(half_amount)?;
        }
        GameState::Won { winner } => {
            escrow.to_account_info().sub_lamports(total_escrow)?;
            if winner == ctx.accounts.player_one.key() {
                ctx.accounts.player_one.add_lamports(total_escrow)?;
            } else if winner == ctx.accounts.player_two.key() {
                ctx.accounts.player_two.add_lamports(total_escrow)?;
            } else {
                return Err(error!(TicTacToeError::UnauthorizedUser))
            }
        }
        GameState::Active => {
            return Err(error!(TicTacToeError::GameNotOver))
        }
    }

    escrow.amount1 = 0;
    escrow.amount2 = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub game: Account<'info, TicTacToeGame>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = escrow.initialized @ TicTacToeError::EscrowNotInitialized,
        constraint = (escrow.get_player_one() == user.key() || escrow.get_player_two() == user.key()) @ TicTacToeError::UnauthorizedUser
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub game: Account<'info, TicTacToeGame>,
    /// CHECK: This is safe because we check that this account matches the player_one in the escrow account
    #[account(
        mut,
        constraint = player_one.key() == escrow.get_player_one() @ TicTacToeError::InvalidPlayerOne
    )]
    pub player_one: AccountInfo<'info>,
    /// CHECK: This is safe because we check that this account matches the player_two in the escrow account
    #[account(
        mut,
        constraint = player_two.key() == escrow.get_player_two() @ TicTacToeError::InvalidPlayerTwo
    )]
    pub player_two: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct EscrowAccount {
    pub amount1: u64,
    pub amount2: u64,
    pub bump: u8,
    player_one: Pubkey,
    player_two: Pubkey,
    initialized: bool,
}

impl EscrowAccount {
    pub fn initialize(&mut self, player_one: Pubkey, player_two: Pubkey, bump: u8) -> Result<()> {
        require!(!self.initialized, TicTacToeError::EscrowAlreadyInitialized);
        self.player_one = player_one;
        self.player_two = player_two;
        self.bump = bump;
        self.initialized = true;
        Ok(())
    }

    pub fn get_player_one(&self) -> Pubkey {
        self.player_one
    }

    pub fn get_player_two(&self) -> Pubkey {
        self.player_two
    }
}