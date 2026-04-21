FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"
COPY . .
RUN dotnet restore
RUN dotnet build -c Release
ENV Jwt__Secret="dummy_secret_key_for_build_purposes_only_12345!"
RUN dotnet ef migrations bundle \
    --self-contained \
    -r linux-x64 \
    -o /app/publish/migrate \
    --configuration Release
RUN dotnet publish -c Release -o /app/publish --no-build
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.Api.dll"]