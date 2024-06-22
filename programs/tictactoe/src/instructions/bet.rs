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

    if escrow.get_player_one() == Pubkey::default() {
        escrow.set_player_one(game.players[0]);
        escrow.set_player_two(game.players[1]);
    }

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
    let escrow = &mut ctx.accounts.escrow;
    let game = &ctx.accounts.game;

    match game.state {
        GameState::Tie => {
            disperse_tie(
                escrow,
                &mut ctx.accounts.player_one,
                &mut ctx.accounts.player_two,
                &ctx.accounts.system_program,
            )?;
        }
        GameState::Won { winner } => {
            disperse_winner(
                escrow,
                &mut ctx.accounts.player_one,
                &mut ctx.accounts.player_two,
                &ctx.accounts.system_program,
                winner,
            )?;
        }
        GameState::Active => {
            return Err(error!(TicTacToeError::GameNotOver))
        }
    }

    escrow.amount1 = 0;
    escrow.amount2 = 0;

    Ok(())
}

fn disperse_winner<'info>(
    escrow: &mut Account<'info, EscrowAccount>,
    player_one: &mut AccountInfo<'info>,
    player_two: &mut AccountInfo<'info>,
    system_program: &Program<'info, System>,
    winner: Pubkey,
) -> Result<()> {
    let total_escrow = escrow.amount1 + escrow.amount2;

    let winner_account = if winner == escrow.get_player_one() {
        player_one
    } else if winner == escrow.get_player_two() {
        player_two
    } else {
        return Err(error!(TicTacToeError::UnauthorizedUser));
    };

    let transfer_instruction_winner = transfer(
        escrow.to_account_info().key,
        winner_account.key,
        total_escrow,
    );

    invoke(
        &transfer_instruction_winner,
        &[
            escrow.to_account_info(),
            winner_account.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    Ok(())
}

fn disperse_tie<'info>(
    escrow: &mut Account<'info, EscrowAccount>,
    player_one: &mut AccountInfo<'info>,
    player_two: &mut AccountInfo<'info>,
    system_program: &Program<'info, System>,
) -> Result<()> {
    let total_escrow = escrow.amount1 + escrow.amount2;
    let half_amount = total_escrow / 2;

    let transfer_instruction_player_one = transfer(
        escrow.to_account_info().key,
        player_one.key,
        half_amount,
    );

    let transfer_instruction_player_two = transfer(
        escrow.to_account_info().key,
        player_two.key,
        half_amount,
    );

    invoke(
        &transfer_instruction_player_one,
        &[
            escrow.to_account_info(),
            player_one.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    invoke(
        &transfer_instruction_player_two,
        &[
            escrow.to_account_info(),
            player_two.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    Ok(())
}
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub game: Account<'info, TicTacToeGame>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
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
    player_one: Pubkey,
    player_two: Pubkey,
}

impl EscrowAccount {
    pub fn get_player_one(&self) -> Pubkey {
        self.player_one
    }

    pub fn get_player_two(&self) -> Pubkey {
        self.player_two
    }

    pub fn set_player_one(&mut self, player: Pubkey) {
        self.player_one = player;
    }

    pub fn set_player_two(&mut self, player: Pubkey) {
        self.player_two = player;
    }
}

