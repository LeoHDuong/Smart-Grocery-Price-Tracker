FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Install EF Tool
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

# Copy everything
COPY . .

# Restore and Build normally first to catch errors
RUN dotnet restore
RUN dotnet build -c Release

# Now generate the bundle
# Note: if your DbContext is in a different project, 
# you might need to add: --project NameOfDataProject.csproj
RUN dotnet ef migrations bundle \
    --self-contained \
    -r linux-x64 \
    -o /app/publish/migrate \
    --configuration Release

# Publish the API
RUN dotnet publish -c Release -o /app/publish --no-build

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.Api.dll"]