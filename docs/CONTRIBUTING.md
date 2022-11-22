# Contribution Guidelines

To facilitate efficient development, it will be helpful to run your own bot
on your test server. To get setup, please follow these guidelines:

## Create your own bot to use in your local dev environment

1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Sign in with your Discord credentials
3. Create a new application, call it whatever you want
4. On the left, select "Bot" and create a bot user
5. Switch on "Presence Intent" and "Server Members Intent"
6. Save your changes
7. On the left, select "OAuth2" and navigate to "URL Generator"
8. Under "Scopes", select "bot" and "application.commands"
9. Permissions: [BOT_PERMISSIONS.md](BOT_PERMISSIONS.md)
10. Select and copy the generated URL under "Scopes."
11. Use the url to add the bot to your test server.

## Set up local environment

1. Clone the repo: `git clone https://github.com/governatorXYZ/governator-bot.git`
2. Create a new feature branch from the dev branch ( e.g.`git checkout -b feature/my-new-feature`).
3. Copy the `.env.template` file and name it `.env`. If you are unsure how to set the 
variables, get in touch with us.
4. `yarn start` will run the prestart script to get everything installed and running.
5. Run your bot and test your connections.
6. Whenever you're ready for a pull request, open a pr with `dev` branch.

IMPORTANT: The bot listens to events emitted from the governator-api. To develop 
features for the bot you probably want to run it locally. 
Check out the [governator-api repo](https://github.com/governatorXYZ/governator-api) to get started.


## Develop!

Work on your features. Tests should be written for new features
that are added. We are using Jest as the test library, so please familiarize
yourself with Jest if you are not already familiar with it. If you need help
with writing tests, please ask, as we have a couple devs on board who have
experience in this area.

When you feel the feature is ready to be battle tested, lint and test your
code prior to pushing it. Submitting a PR will trigger this workflow anyway. However, the less we have to do to fix merge
conflicts and failed workflows, the better.

Once the branch is ready to be merged, push it to the repo and create a PR
to the develop branch. From this point, it will follow the details set out in
WORKFLOW.md.
